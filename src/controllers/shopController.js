const { prisma } = require('../config/database');

/**
 * GET /shops — list shops (optional ?near= lat,lng or ?search=).
 */
async function list(req, res, next) {
  try {
    const { near, search } = req.query;
    const where = { status: 'approved' };

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const shops = await prisma.shop.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        lat: true,
        lng: true,
        rating: true,
        languages: true,
        priceRange: true,
        tier: true,
      },
    });

    if (near) {
      const [lat, lng] = String(near).split(',').map(Number);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        shops.sort((a, b) => {
          const distA = (a.lat != null && a.lng != null) ? (a.lat - lat) ** 2 + (a.lng - lng) ** 2 : Infinity;
          const distB = (b.lat != null && b.lng != null) ? (b.lat - lat) ** 2 + (b.lng - lng) ** 2 : Infinity;
          return distA - distB;
        });
      }
    }

    res.json({ success: true, data: shops });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /shops/:id — shop by id with basic info.
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        description: true,
        lat: true,
        lng: true,
        rating: true,
        languages: true,
        priceRange: true,
        tier: true,
        operatingHours: true,
      },
    });

    if (!shop) {
      return res.status(404).json({ success: false, error: { message: 'Shop not found' } });
    }

    res.json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /shops/:id/reviews — reviews for a shop.
 */
async function getReviews(req, res, next) {
  try {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!shop) {
      return res.status(404).json({ success: false, error: { message: 'Shop not found' } });
    }

    const reviews = await prisma.shopReview.findMany({
      where: { shopId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /shops/:id/capacity-window — add a capacity window (earliest/latest + constraints).
 * Body: { earliestAt, latestAt, constraints? }
 */
async function addCapacityWindow(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id: shopId } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) {
      return res.status(404).json({ success: false, error: { message: 'Shop not found' } });
    }
    const { earliestAt, latestAt, constraints } = req.body || {};
    if (!earliestAt || !latestAt) {
      return res.status(400).json({
        success: false,
        error: { message: 'earliestAt and latestAt (ISO dates) required' },
      });
    }
    const window = await prisma.capacityWindow.create({
      data: {
        shopId,
        earliestAt: new Date(earliestAt),
        latestAt: new Date(latestAt),
        constraints: constraints || null,
      },
    });
    res.status(201).json({ success: true, data: window });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, getReviews, addCapacityWindow };
