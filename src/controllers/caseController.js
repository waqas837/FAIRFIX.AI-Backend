const { prisma } = require('../config/database');

/**
 * GET /cases — list cases for current user.
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
      where.state = status;
    }

    const cases = await prisma.case.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        vehicle: { select: { id: true, make: true, model: true, year: true, vin: true } },
        shop: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /cases/:id — case by id (must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
      include: {
        vehicle: true,
        shop: true,
        installWindows: true,
        decisionLocks: true,
        appointments: true,
        shipments: { select: { id: true, state: true, trackingNumber: true } },
      },
    });

    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }

    res.json({ success: true, data: caseRecord });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
