const { prisma } = require('../config/database');

/**
 * GET /repairs — list repairs for current user (optional ?status=).
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

    const repairs = await prisma.repair.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: {
        vehicle: { select: { id: true, make: true, model: true, year: true, vin: true } },
      },
    });

    res.json({ success: true, data: repairs });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /repairs/:id — repair by id (must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const repair = await prisma.repair.findFirst({
      where: { id, userId },
      include: { vehicle: true },
    });

    if (!repair) {
      return res.status(404).json({ success: false, error: { message: 'Repair not found' } });
    }

    res.json({ success: true, data: repair });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
