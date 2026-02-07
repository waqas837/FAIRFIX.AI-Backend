const { prisma } = require('../config/database');

/**
 * GET /orders — list orders for current user (optional ?status=).
 */
async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const { status } = req.query;
    const where = { userId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { items: true },
    });

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orders/:id — order by id (must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
