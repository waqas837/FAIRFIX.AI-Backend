const { prisma } = require('../config/database');

/**
 * GET /vehicles — list vehicles for current user.
 */
async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: vehicles });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /vehicles/:id — vehicle by id (must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, userId },
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
    }

    res.json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
