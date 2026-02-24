const { prisma } = require('../config/database');
const { verifyWebhookSignature } = require('../utils/stripeHelpers');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Idempotency tracking
const processedEvents = new Set();

/**
 * POST /webhooks/stripe — Stripe webhook handler
 */
async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  
  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Idempotency check
  if (processedEvents.has(event.id)) {
    console.log(`Event ${event.id} already processed, skipping`);
    return res.json({ received: true, status: 'already_processed' });
  }

  try {
    await handleEvent(event);
    processedEvents.add(event.id);
    
    // Clean up old events (keep last 1000)
    if (processedEvents.size > 1000) {
      const eventsArray = Array.from(processedEvents);
      processedEvents.clear();
      eventsArray.slice(-500).forEach(id => processedEvents.add(id));
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleEvent(event) {
  console.log(`Processing webhook event: ${event.type}`);

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleSubscriptionUpdate(subscription) {
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id }
  });

  if (!existingSubscription) {
    console.log(`Subscription ${subscription.id} not found in database`);
    return;
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      nextBillingAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
    }
  });

  console.log(`Updated subscription ${subscription.id} to status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'canceled',
      canceledAt: new Date()
    }
  });

  console.log(`Subscription ${subscription.id} deleted`);
}

async function handleInvoicePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: invoice.subscription },
    data: {
      status: 'active',
      nextBillingAt: invoice.period_end ? new Date(invoice.period_end * 1000) : null
    }
  });

  // Create ledger entry for subscription payment
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: invoice.subscription }
  });

  if (subscription) {
    await prisma.ledger.create({
      data: {
        type: 'subscription_payment',
        referenceType: 'subscription',
        referenceId: subscription.id,
        userId: subscription.userId,
        amountCents: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        status: 'completed',
        stripePaymentIntentId: invoice.payment_intent,
        stripeChargeId: invoice.charge,
        description: `Subscription payment - ${subscription.plan}`
      }
    });
  }

  console.log(`Invoice ${invoice.id} payment succeeded`);
}

async function handleInvoicePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: invoice.subscription },
    data: { status: 'past_due' }
  });

  console.log(`Invoice ${invoice.id} payment failed`);
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  const { metadata } = paymentIntent;

  if (metadata.type === 'expert_call' && metadata.expertCallId) {
    // Update ledger entry
    await prisma.ledger.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'completed' }
    });

    console.log(`Payment intent ${paymentIntent.id} succeeded for expert call ${metadata.expertCallId}`);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  const { metadata } = paymentIntent;

  if (metadata.type === 'expert_call' && metadata.expertCallId) {
    // Update ledger entry
    await prisma.ledger.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'failed' }
    });

    console.log(`Payment intent ${paymentIntent.id} failed for expert call ${metadata.expertCallId}`);
  }
}

async function handleChargeRefunded(charge) {
  // Update ledger entries
  await prisma.ledger.updateMany({
    where: { stripeChargeId: charge.id },
    data: { status: 'refunded' }
  });

  console.log(`Charge ${charge.id} refunded`);
}

module.exports = { handleStripeWebhook };
