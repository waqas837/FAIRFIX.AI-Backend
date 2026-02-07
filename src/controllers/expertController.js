const { prisma } = require('../config/database');

/**
 * GET /experts — list experts (optional ?status=ACTIVE).
 */
async function list(req, res, next) {
  try {
    const { status } = req.query;
    const where = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const experts = await prisma.expert.findMany({
      where,
      orderBy: { rating: 'desc' },
      select: {
        id: true,
        name: true,
        title: true,
        rating: true,
        callsCompleted: true,
        status: true,
        skills: true,
        languages: true,
      },
    });

    res.json({ success: true, data: experts });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /experts/:id — expert by id.
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;

    const expert = await prisma.expert.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        title: true,
        rating: true,
        callsCompleted: true,
        status: true,
        skills: true,
        languages: true,
        introVideoUrl: true,
      },
    });

    if (!expert) {
      return res.status(404).json({ success: false, error: { message: 'Expert not found' } });
    }

    res.json({ success: true, data: expert });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
