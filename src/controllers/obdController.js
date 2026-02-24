const { prisma } = require('../config/database');

/**
 * POST /obd/devices — link OBD device to vehicle
 */
async function linkDevice(req, res, next) {
  try {
    const userId = req.user?.id;
    const { vehicleId, deviceId, manufacturer, model, firmwareVersion, connectionType } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    if (!vehicleId || !deviceId) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Vehicle ID and Device ID are required' } 
      });
    }

    // Verify vehicle belongs to user
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId }
    });

    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Vehicle not found' } 
      });
    }

    // Check if device already linked
    const existingDevice = await prisma.oBDDevice.findUnique({
      where: { deviceId }
    });

    if (existingDevice) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Device already linked to a vehicle' } 
      });
    }

    // Create device link
    const device = await prisma.oBDDevice.create({
      data: {
        vehicleId,
        deviceId,
        manufacturer,
        model,
        firmwareVersion,
        connectionType,
        lastConnectedAt: new Date(),
        status: 'active'
      }
    });

    res.status(201).json({ success: true, data: device });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /obd/devices — list OBD devices for user's vehicles
 */
async function listDevices(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const devices = await prisma.oBDDevice.findMany({
      where: {
        vehicle: { userId }
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            plateNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: devices });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /obd/devices/:deviceId — unlink OBD device
 */
async function unlinkDevice(req, res, next) {
  try {
    const userId = req.user?.id;
    const { deviceId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const device = await prisma.oBDDevice.findUnique({
      where: { deviceId },
      include: { vehicle: true }
    });

    if (!device) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Device not found' } 
      });
    }

    if (device.vehicle.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Unauthorized to unlink this device' } 
      });
    }

    await prisma.oBDDevice.delete({
      where: { deviceId }
    });

    res.json({ success: true, message: 'Device unlinked successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /obd/scans — ingest diagnostic scan data
 */
async function ingestScan(req, res, next) {
  try {
    const userId = req.user?.id;
    const { vehicleId, deviceId, codes, report } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    if (!vehicleId || !deviceId) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Vehicle ID and Device ID are required' } 
      });
    }

    // Verify vehicle belongs to user
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId }
    });

    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Vehicle not found' } 
      });
    }

    // Verify device is linked to this vehicle
    const device = await prisma.oBDDevice.findFirst({
      where: { deviceId, vehicleId }
    });

    if (!device) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Device not linked to this vehicle' } 
      });
    }

    // Create diagnostic scan
    const scan = await prisma.diagnosticScan.create({
      data: {
        vehicleId,
        status: 'completed',
        codes: codes || {},
        report: report || {},
        scannedAt: new Date(),
        retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year retention
      }
    });

    // Update device last connected time
    await prisma.oBDDevice.update({
      where: { deviceId },
      data: { lastConnectedAt: new Date() }
    });

    // Generate alerts based on DTCs
    if (codes && Array.isArray(codes.dtcs)) {
      for (const dtc of codes.dtcs) {
        await generateDTCAlert(userId, vehicleId, dtc);
      }
    }

    res.status(201).json({ success: true, data: scan });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /obd/scans/:vehicleId — get scan history for vehicle
 */
async function getScanHistory(req, res, next) {
  try {
    const userId = req.user?.id;
    const { vehicleId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    // Verify vehicle belongs to user
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId }
    });

    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Vehicle not found' } 
      });
    }

    const scans = await prisma.diagnosticScan.findMany({
      where: { vehicleId },
      orderBy: { scannedAt: 'desc' },
      take: 50
    });

    res.json({ success: true, data: scans });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate alert based on DTC code
 */
async function generateDTCAlert(userId, vehicleId, dtc) {
  const severityMap = {
    'P0': 'high',    // Powertrain
    'C0': 'medium',  // Chassis
    'B0': 'low',     // Body
    'U0': 'medium'   // Network
  };

  const codePrefix = dtc.code?.substring(0, 2);
  const severity = severityMap[codePrefix] || 'medium';

  await prisma.alert.create({
    data: {
      userId,
      vehicleId,
      type: 'diagnostic_trouble_code',
      title: `Diagnostic Code: ${dtc.code}`,
      message: dtc.description || 'Vehicle diagnostic issue detected',
      read: false,
      retentionUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days retention
    }
  });
}

module.exports = {
  linkDevice,
  listDevices,
  unlinkDevice,
  ingestScan,
  getScanHistory
};
