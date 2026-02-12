const { prisma } = require('../config/database');
const { CASE_STATES, canTransition } = require('../utils/caseStateMachine');

/**
 * GET /vendor — list vendors (for case flow: pick one for availability confirm).
 */
async function list(req, res, next) {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json({ success: true, data: vendors });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /vendor/availability-confirm — confirm vendor availability for a case.
 * Body: { caseId, vendorId, sku, quantity, available, leadTimeMinDays?, leadTimeMaxDays?, serviceLevel?, cutoffTime?, backorderRisk?, validUntil, confirmationRef? }
 */
async function availabilityConfirm(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const body = req.body || {};
    const {
      caseId,
      vendorId,
      sku,
      quantity,
      available,
      leadTimeMinDays,
      leadTimeMaxDays,
      serviceLevel,
      cutoffTime,
      backorderRisk,
      validUntil,
      confirmationRef,
    } = body;
    if (!caseId || !vendorId || !sku || quantity == null || typeof available !== 'boolean' || !validUntil) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'caseId, vendorId, sku, quantity, available (boolean), validUntil (ISO date) required',
        },
      });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId },
      include: { vendorCommitments: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const nextState = CASE_STATES.VENDOR_AVAIL_CONFIRMED;
    if (!canTransition(caseRecord.state, nextState)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Case must be in DECISION_LOCKED state to confirm vendor availability' },
      });
    }
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Vendor not found. Run "node scripts/seed-vendors.js" in the backend folder to create a test vendor, then try again.',
        },
      });
    }
    const [commitment, updatedCase] = await prisma.$transaction([
      prisma.vendorFulfillmentCommitment.create({
        data: {
          caseId,
          vendorId,
          sku,
          quantity,
          available,
          leadTimeMinDays: leadTimeMinDays ?? null,
          leadTimeMaxDays: leadTimeMaxDays ?? null,
          serviceLevel: serviceLevel || null,
          cutoffTime: cutoffTime ? new Date(cutoffTime) : null,
          backorderRisk: backorderRisk ?? false,
          validUntil: new Date(validUntil),
          confirmationRef: confirmationRef || null,
        },
      }),
      prisma.case.update({
        where: { id: caseId },
        data: { state: nextState },
        include: {
          vehicle: true,
          shop: true,
          installWindows: true,
          decisionLocks: true,
          vendorCommitments: true,
          appointments: true,
          shipments: true,
        },
      }),
    ]);
    res.status(201).json({ success: true, data: { commitment, case: updatedCase } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, availabilityConfirm };
