const { prisma } = require('../config/database');

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

module.exports = { list, getById };
