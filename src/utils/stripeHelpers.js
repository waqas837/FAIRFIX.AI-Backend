const stripe = require('../config/stripe');
const { prisma } = require('../config/database');

const EXPERT_SPLIT_PERCENTAGE = 0.70; // 70% to expert
const PLATFORM_FEE_PERCENTAGE = 0.30; // 30% to platform

const EXPERT_CALL_PRICE_CENTS = 4999; // $49.99 per 30 minutes

/**
 * Create or retrieve Stripe customer for user
 */
async function getOrCreateStripeCustomer(userId, email, name) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: { take: 1, orderBy: { createdAt: 'desc' } } }
  });

  if (user.subscriptions[0]?.stripeCustomerId) {
    return user.subscriptions[0].stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId }
  });

  return customer.id;
}

/**
 * Create subscription for customer
 */
async function createSubscription(userId, priceId, plan) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  const customerId = await getOrCreateStripeCustomer(
    userId,
    user.email,
    `${user.firstName} ${user.lastName}`
  );

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata: { userId, plan }
  });

  await prisma.subscription.create({
    data: {
      userId,
      plan,
      status: subscription.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      nextBillingAt: new Date(subscription.current_period_end * 1000)
    }
  });

  return subscription;
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd
  });

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      cancelAtPeriodEnd,
      canceledAt: cancelAtPeriodEnd ? null : new Date(),
      status: cancelAtPeriodEnd ? 'active' : 'canceled'
    }
  });

  return subscription;
}

/**
 * Create payment intent for expert call
 */
async function createExpertCallPaymentIntent(userId, expertId, expertCallId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  const customerId = await getOrCreateStripeCustomer(
    userId,
    user.email,
    `${user.firstName} ${user.lastName}`
  );

  const paymentIntent = await stripe.paymentIntents.create({
    amount: EXPERT_CALL_PRICE_CENTS,
    currency: 'usd',
    customer: customerId,
    metadata: {
      userId,
      expertId,
      expertCallId,
      type: 'expert_call'
    },
    automatic_payment_methods: { enabled: true }
  });

  return paymentIntent;
}

/**
 * Create ledger entry for expert call payment
 */
async function createExpertCallLedgerEntry(paymentIntent, expertCallId, userId, expertId) {
  const amountCents = paymentIntent.amount;
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENTAGE);
  const expertEarningsCents = amountCents - platformFeeCents;

  await prisma.ledger.create({
    data: {
      type: 'expert_call_payment',
      referenceType: 'expert_call',
      referenceId: expertCallId,
      userId,
      expertId,
      amountCents,
      platformFeeCents,
      expertEarningsCents,
      currency: 'USD',
      status: 'completed',
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: paymentIntent.charges?.data[0]?.id,
      stripeBalanceTransactionId: paymentIntent.charges?.data[0]?.balance_transaction,
      description: `Expert call payment - $${(amountCents / 100).toFixed(2)}`
    }
  });

  return { platformFeeCents, expertEarningsCents };
}

/**
 * Create Stripe Connect account for expert
 */
async function createExpertConnectAccount(expertId, email) {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      transfers: { requested: true }
    },
    metadata: { expertId }
  });

  await prisma.expert.update({
    where: { id: expertId },
    data: { stripeAccountId: account.id }
  });

  return account;
}

/**
 * Create account link for expert onboarding
 */
async function createExpertAccountLink(accountId, refreshUrl, returnUrl) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });

  return accountLink;
}

/**
 * Transfer earnings to expert
 */
async function transferToExpert(expertId, amountCents, expertCallId) {
  const expert = await prisma.expert.findUnique({ where: { id: expertId } });

  if (!expert.stripeAccountId) {
    throw new Error('Expert has not connected their Stripe account');
  }

  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: 'usd',
    destination: expert.stripeAccountId,
    metadata: {
      expertId,
      expertCallId,
      type: 'expert_payout'
    }
  });

  await prisma.ledger.create({
    data: {
      type: 'expert_payout',
      referenceType: 'expert_call',
      referenceId: expertCallId,
      expertId,
      amountCents,
      currency: 'USD',
      status: 'completed',
      stripeTransferId: transfer.id,
      stripeBalanceTransactionId: transfer.balance_transaction,
      description: `Expert payout - $${(amountCents / 100).toFixed(2)}`
    }
  });

  return transfer;
}

/**
 * Process refund
 */
async function processRefund(paymentIntentId, amountCents, reason) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
    reason: reason || 'requested_by_customer'
  });

  const ledgerEntry = await prisma.ledger.findFirst({
    where: { stripePaymentIntentId: paymentIntentId }
  });

  if (ledgerEntry) {
    await prisma.ledger.update({
      where: { id: ledgerEntry.id },
      data: {
        status: 'refunded',
        stripeRefundId: refund.id
      }
    });
  }

  return refund;
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
}

module.exports = {
  getOrCreateStripeCustomer,
  createSubscription,
  cancelSubscription,
  createExpertCallPaymentIntent,
  createExpertCallLedgerEntry,
  createExpertConnectAccount,
  createExpertAccountLink,
  transferToExpert,
  processRefund,
  verifyWebhookSignature,
  EXPERT_CALL_PRICE_CENTS,
  EXPERT_SPLIT_PERCENTAGE,
  PLATFORM_FEE_PERCENTAGE
};
