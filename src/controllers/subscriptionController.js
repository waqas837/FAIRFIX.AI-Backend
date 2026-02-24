const { prisma } = require('../config/database');
const { createSubscription, cancelSubscription } = require('../utils/stripeHelpers');

/**
 * GET /subscriptions — list subscriptions for current user (usually one active).
 */
async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: subscriptions });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /subscriptions/:id — subscription by id (must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId },
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: { message: 'Subscription not found' } });
    }

    res.json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions — create new subscription
 */
async function create(req, res, next) {
  try {
    const userId = req.user?.id;
    const { plan, priceId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    if (!plan || !priceId) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Plan and priceId are required' } 
      });
    }

    // Check for existing active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: { 
        userId, 
        status: { in: ['active', 'trialing'] }
      }
    });

    if (existingSubscription) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'User already has an active subscription' } 
      });
    }

    const subscription = await createSubscription(userId, priceId, plan);

    res.status(201).json({ 
      success: true, 
      data: { 
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
      } 
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /subscriptions/:id/cancel — cancel subscription
 */
async function cancel(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { cancelAtPeriodEnd = true } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId }
    });

    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Subscription not found' } 
      });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'No Stripe subscription found' } 
      });
    }

    await cancelSubscription(subscription.stripeSubscriptionId, cancelAtPeriodEnd);

    res.json({ 
      success: true, 
      message: cancelAtPeriodEnd 
        ? 'Subscription will be canceled at period end' 
        : 'Subscription canceled immediately'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /subscriptions/active — get active subscription for current user
 */
async function getActive(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { 
        userId, 
        status: { in: ['active', 'trialing'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'No active subscription found' } 
      });
    }

    res.json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, cancel, getActive };
