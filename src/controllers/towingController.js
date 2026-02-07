const { prisma } = require('../config/database');

/**
 * GET /towing/history — list towing requests for current user (optional ?status=).
 */
async function history(req, res, next) {
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

    const requests = await prisma.towingRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
    });

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /towing/:id — towing request by id (must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const request = await prisma.towingRequest.findFirst({
      where: { id, userId },
    });

    if (!request) {
      return res.status(404).json({ success: false, error: { message: 'Towing request not found' } });
    }

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
}

module.exports = { history, getById };
