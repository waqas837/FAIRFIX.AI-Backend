const { prisma } = require('../config/database');

/**
 * GET /alerts — list alerts for current user (optional ?read=, ?vehicleId=).
 */
async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const { read, vehicleId } = req.query;
    const where = { userId };
    if (read !== undefined) {
      where.read = read === 'true';
    }
    if (vehicleId && typeof vehicleId === 'string') {
      where.vehicleId = vehicleId;
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
