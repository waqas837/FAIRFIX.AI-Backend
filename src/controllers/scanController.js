const { prisma } = require('../config/database');

/**
 * GET /vehicles/:vehicleId/scans — list scans for a vehicle (must own vehicle).
 */
async function listByVehicle(req, res, next) {
  try {
    const userId = req.user?.id;
    const { vehicleId } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });
    if (!vehicle) {
      return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
    }

    const scans = await prisma.diagnosticScan.findMany({
      where: { vehicleId },
      orderBy: { scannedAt: 'desc' },
    });

    res.json({ success: true, data: scans });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /scans/:id — scan by id (vehicle must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const scan = await prisma.diagnosticScan.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!scan) {
      return res.status(404).json({ success: false, error: { message: 'Scan not found' } });
    }
    if (scan.vehicle.userId !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    res.json({ success: true, data: scan });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /vehicles/:vehicleId/scans/latest — latest scan for vehicle.
 */
async function getLatest(req, res, next) {
  try {
    const userId = req.user?.id;
    const { vehicleId } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });
    if (!vehicle) {
      return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
    }

    const scan = await prisma.diagnosticScan.findFirst({
      where: { vehicleId },
      orderBy: { scannedAt: 'desc' },
    });

    res.json({ success: true, data: scan });
  } catch (err) {
    next(err);
  }
}

module.exports = { listByVehicle, getById, getLatest };
