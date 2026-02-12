const { prisma } = require('../config/database');
const { CASE_STATES, canTransition, canTriggerShipment } = require('../utils/caseStateMachine');

/**
 * POST /cases/:id/shipments — create a draft shipment for a case.
 * Body: { trackingNumber?, alertsEnabled?, carrierWebhookRegistered? }
 */
async function createShipment(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id: caseId } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, userId },
      include: { vendorCommitments: true, decisionLocks: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    if (caseRecord.state !== CASE_STATES.SHOP_APPOINTMENT_LOCKED) {
      return res.status(400).json({
        success: false,
        error: { message: 'Case must be in SHOP_APPOINTMENT_LOCKED to create a shipment' },
      });
    }
    const body = req.body || {};
    const shipment = await prisma.shipment.create({
      data: {
        caseId,
        state: 'draft',
        trackingNumber: body.trackingNumber || null,
        alertsEnabled: body.alertsEnabled ?? false,
        carrierWebhookRegistered: body.carrierWebhookRegistered ?? false,
      },
    });
    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /shipments/:id/trigger — move shipment to SHIP_TRIGGERED and case to SHIP_TRIGGERED.
 * Gate: alerts enabled, tracking number set, carrier webhook registered.
 */
async function trigger(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { case: true },
    });
    if (!shipment) {
      return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
    }
    if (shipment.case.userId !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized for this shipment' } });
    }
    if (!canTriggerShipment(shipment)) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Cannot trigger: shipment must have alertsEnabled=true, trackingNumber set, and carrierWebhookRegistered=true',
        },
      });
    }
    const nextCaseState = CASE_STATES.SHIP_TRIGGERED;
    if (!canTransition(shipment.case.state, nextCaseState)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Case is not in SHOP_APPOINTMENT_LOCKED state' },
      });
    }
    const [updatedShipment, updatedCase] = await prisma.$transaction([
      prisma.shipment.update({
        where: { id },
        data: { state: 'SHIP_TRIGGERED' },
      }),
      prisma.case.update({
        where: { id: shipment.caseId },
        data: { state: nextCaseState },
      }),
    ]);
    res.json({ success: true, data: { shipment: updatedShipment, case: updatedCase } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /shipments/:id/transit — set shipment to IN_TRANSIT (and case state if first shipment).
 */
async function setInTransit(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { case: true },
    });
    if (!shipment) {
      return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
    }
    if (shipment.case.userId !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized for this shipment' } });
    }
    if (shipment.state !== 'SHIP_TRIGGERED') {
      return res.status(400).json({
        success: false,
        error: { message: 'Shipment must be in SHIP_TRIGGERED state' },
      });
    }
    const updated = await prisma.shipment.update({
      where: { id },
      data: { state: 'IN_TRANSIT' },
    });
    const caseState = shipment.case.state === CASE_STATES.SHIP_TRIGGERED
      ? CASE_STATES.IN_TRANSIT
      : shipment.case.state;
    if (caseState !== shipment.case.state) {
      await prisma.case.update({
        where: { id: shipment.caseId },
        data: { state: caseState },
      });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /shipments/:id/delivered — set shipment to DELIVERED and case to DELIVERED when applicable.
 */
async function setDelivered(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { case: true },
    });
    if (!shipment) {
      return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
    }
    if (shipment.case.userId !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized for this shipment' } });
    }
    if (shipment.state !== 'IN_TRANSIT') {
      return res.status(400).json({
        success: false,
        error: { message: 'Shipment must be in IN_TRANSIT state' },
      });
    }
    const [updatedShipment] = await prisma.$transaction([
      prisma.shipment.update({
        where: { id },
        data: { state: 'DELIVERED' },
      }),
      prisma.case.update({
        where: { id: shipment.caseId },
        data: { state: CASE_STATES.DELIVERED },
      }),
    ]);
    res.json({ success: true, data: updatedShipment });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /shipments/webhook/carrier-exception — carrier exception webhook (can be called without auth for carrier callbacks).
 * Body: { shipmentId?, trackingNumber?, event?, payload? }
 */
async function carrierExceptionWebhook(req, res, next) {
  try {
    const body = req.body || {};
    const { shipmentId, trackingNumber, event, payload } = body;
    let shipment;
    if (shipmentId) {
      shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    } else if (trackingNumber) {
      shipment = await prisma.shipment.findFirst({
        where: { trackingNumber },
      });
    }
    if (!shipment) {
      return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
    }
    await prisma.caseException.create({
      data: {
        caseId: shipment.caseId,
        type: 'CARRIER_EXCEPTION',
        payload: { event, payload, receivedAt: new Date().toISOString() },
      },
    });
    res.json({ success: true, message: 'Webhook received' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /shipments/:id/custody — add a custody event. Body: { custody, proofRef?, declaredValue?, insuranceRef? }
 */
async function addCustodyEvent(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { case: true },
    });
    if (!shipment) {
      return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
    }
    if (shipment.case.userId !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    const { custody, proofRef, declaredValue, insuranceRef } = req.body || {};
    const allowed = ['SUPPLIER_CUSTODY', 'CARRIER_CUSTODY', 'SHOP_CUSTODY', 'CUSTOMER_CUSTODY'];
    if (!custody || !allowed.includes(custody)) {
      return res.status(400).json({
        success: false,
        error: { message: `custody must be one of: ${allowed.join(', ')}` },
      });
    }
    const event = await prisma.custodyEvent.create({
      data: {
        caseId: shipment.caseId,
        shipmentId: id,
        custody,
        proofRef: proofRef || null,
        declaredValue: declaredValue != null ? Number(declaredValue) : null,
        insuranceRef: insuranceRef || null,
      },
    });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /shipments/:id — update draft shipment (trackingNumber, alertsEnabled, carrierWebhookRegistered).
 */
async function updateShipment(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { case: true },
    });
    if (!shipment) {
      return res.status(404).json({ success: false, error: { message: 'Shipment not found' } });
    }
    if (shipment.case.userId !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    if (shipment.state !== 'draft') {
      return res.status(400).json({
        success: false,
        error: { message: 'Can only update a draft shipment' },
      });
    }
    const body = req.body || {};
    const data = {};
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber;
    if (body.alertsEnabled !== undefined) data.alertsEnabled = !!body.alertsEnabled;
    if (body.carrierWebhookRegistered !== undefined) data.carrierWebhookRegistered = !!body.carrierWebhookRegistered;
    const updated = await prisma.shipment.update({
      where: { id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createShipment,
  trigger,
  setInTransit,
  setDelivered,
  carrierExceptionWebhook,
  addCustodyEvent,
  updateShipment,
};
