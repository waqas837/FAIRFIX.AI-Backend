const { prisma } = require('../config/database');
const { hashVIN } = require('../utils/compliance');

/**
 * GET /vehicles — list vehicles for current user.
 */
async function list(req, res, next) {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        vinHash: true, // Only return hash, never plain VIN
        plateNumber: true,
        make: true,
        model: true,
        year: true,
        mileage: true,
        createdAt: true,
        updatedAt: true
      }
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
    const userId = req.user?.id || req.userId;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, userId },
      select: {
        id: true,
        userId: true,
        vinHash: true, // Only return hash, never plain VIN
        plateNumber: true,
        make: true,
        model: true,
        year: true,
        mileage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
    }

    res.json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /vehicles — create vehicle (hash VIN before storing)
 */
async function create(req, res, next) {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const { vin, plateNumber, make, model, year, mileage } = req.body;

    // Hash VIN for compliance
    const vinHash = vin ? hashVIN(vin) : null;

    const vehicle = await prisma.vehicle.create({
      data: {
        userId,
        vin: null, // Never store plain VIN
        vinHash,
        plateNumber,
        make,
        model,
        year,
        mileage
      },
      select: {
        id: true,
        userId: true,
        vinHash: true,
        plateNumber: true,
        make: true,
        model: true,
        year: true,
        mileage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create };
