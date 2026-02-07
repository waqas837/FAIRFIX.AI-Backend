const { prisma } = require('../config/database');

/**
 * GET /expert-calls — list expert calls for current user.
 */
async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const calls = await prisma.expertCall.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        expert: { select: { id: true, name: true, title: true, rating: true } },
      },
    });

    res.json({ success: true, data: calls });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /expert-calls/:id — expert call by id (must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const call = await prisma.expertCall.findFirst({
      where: { id, userId },
      include: { expert: true },
    });

    if (!call) {
      return res.status(404).json({ success: false, error: { message: 'Expert call not found' } });
    }

    res.json({ success: true, data: call });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
