const crypto = require('crypto');
const { prisma } = require('../config/database');
const {
  CASE_STATES,
  canTransition,
  canCreateDecisionLock,
  canLockAppointment,
  canStartInstall,
  EXCEPTION_TYPES,
} = require('../utils/caseStateMachine');

const CASE_INCLUDE = {
  vehicle: true,
  shop: true,
  installWindows: true,
  decisionLocks: true,
  decisionReceipts: true,
  vendorCommitments: true,
  appointments: true,
  shipments: true,
};

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
        decisionReceipts: true,
        vendorCommitments: true,
        appointments: true,
        shipments: { select: { id: true, state: true, trackingNumber: true, alertsEnabled: true, carrierWebhookRegistered: true } },
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

/**
 * POST /cases — create a new case (customer). Body: { vehicleId, shopId } (both required).
 */
async function create(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const { vehicleId, shopId } = req.body || {};
    if (!vehicleId || !shopId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Vehicle and shop are required. Please select a vehicle and a shop.' },
      });
    }
    const [vehicle, shop] = await Promise.all([
      prisma.vehicle.findFirst({ where: { id: vehicleId, userId } }),
      prisma.shop.findFirst({ where: { id: shopId, status: 'approved' } }),
    ]);
    if (!vehicle) {
      return res.status(400).json({
        success: false,
        error: { message: 'Vehicle not found or does not belong to you.' },
      });
    }
    if (!shop) {
      return res.status(400).json({
        success: false,
        error: { message: 'Shop not found or not available.' },
      });
    }
    const caseRecord = await prisma.case.create({
      data: {
        userId,
        vehicleId,
        shopId,
        state: CASE_STATES.CASE_CREATED,
      },
      include: CASE_INCLUDE,
    });
    res.status(201).json({ success: true, data: caseRecord });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/verify — move to VERIFYING or VERIFIED_WITH_UNKNOWNS.
 * Body: { verified?: boolean, diagnosticSummary?, recommendedParts?, laborEstimateHours? }
 */
async function verify(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
      include: { installWindows: true, decisionLocks: true, vendorCommitments: true, shipments: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const { verified, diagnosticSummary, recommendedParts, laborEstimateHours } = req.body || {};
    let nextState;
    if (verified === true) {
      nextState = CASE_STATES.VERIFIED_WITH_UNKNOWNS;
      if (!canTransition(caseRecord.state, nextState)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Finish verification only after the shop has started the diagnostic. Your case is currently in "${caseRecord.state}". Run "Verify (start)" first, then "Verify (done)".`,
          },
        });
      }
    } else {
      nextState = CASE_STATES.VERIFYING;
      if (!canTransition(caseRecord.state, nextState)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `You can only start verification when the case is newly created. Your case is currently in "${caseRecord.state}". Run the steps in order: create a case first, then "Verify (start)".`,
          },
        });
      }
    }
    const updated = await prisma.case.update({
      where: { id },
      data: {
        state: nextState,
        ...(diagnosticSummary !== undefined && { diagnosticSummary }),
        ...(recommendedParts !== undefined && { recommendedParts }),
        ...(laborEstimateHours !== undefined && { laborEstimateHours }),
      },
      include: CASE_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/install-window/propose — propose an install window. Body: { startAt, endAt } (ISO dates)
 */
async function proposeInstallWindow(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
      include: { installWindows: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const nextState = CASE_STATES.INSTALL_WINDOW_PROPOSED;
    if (!canTransition(caseRecord.state, nextState)) {
      const nextStep = caseRecord.state === CASE_STATES.INSTALL_WINDOW_PROPOSED || caseRecord.state === CASE_STATES.INSTALL_WINDOW_ACCEPTED
        ? 'Run "Accept install window" next.'
        : 'Complete "Verify (done)" first.';
      return res.status(400).json({
        success: false,
        error: {
          message: `Your case is currently in "${caseRecord.state}". ${nextStep}`,
        },
      });
    }
    const { startAt, endAt } = req.body || {};
    if (!startAt || !endAt) {
      return res.status(400).json({
        success: false,
        error: { message: 'startAt and endAt (ISO date strings) required' },
      });
    }
    const [window, updatedCase] = await prisma.$transaction([
      prisma.installWindow.create({
        data: {
          caseId: id,
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          status: 'proposed',
        },
      }),
      prisma.case.update({
        where: { id },
        data: { state: nextState },
        include: CASE_INCLUDE,
      }),
    ]);
    res.status(201).json({ success: true, data: { installWindow: window, case: updatedCase } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/install-window/accept — accept an install window. Body: { installWindowId }
 */
async function acceptInstallWindow(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
      include: { installWindows: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const nextState = CASE_STATES.INSTALL_WINDOW_ACCEPTED;
    if (!canTransition(caseRecord.state, nextState)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `You can only accept an install window after the shop has proposed one. Your case is currently in "${caseRecord.state}". Run "Propose install window" first.`,
        },
      });
    }
    const { installWindowId } = req.body || {};
    if (!installWindowId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Run "Propose install window" first. After it completes, run "Accept install window" — the app fills the ID from the previous step.',
        },
      });
    }
    const window = caseRecord.installWindows.find((w) => w.id === installWindowId);
    if (!window || window.status !== 'proposed') {
      return res.status(400).json({
        success: false,
        error: { message: 'Install window not found or not proposed' },
      });
    }
    const now = new Date();
    await prisma.$transaction([
      prisma.installWindow.update({
        where: { id: installWindowId },
        data: { status: 'accepted', acceptedAt: now },
      }),
      prisma.case.update({
        where: { id },
        data: { state: nextState },
      }),
    ]);
    const updated = await prisma.case.findUnique({
      where: { id },
      include: CASE_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/decision-lock — create decision lock (and auto decision receipt). Gate: install window accepted.
 */
async function createDecisionLock(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
      include: { installWindows: true, decisionLocks: true, vendorCommitments: true, shipments: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    if (!canCreateDecisionLock(caseRecord)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `You must accept the install window before locking the decision. Your case is currently in "${caseRecord.state}". Run "Accept install window" first.`,
        },
      });
    }
    if (caseRecord.decisionLocks?.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'This case already has a decision lock. Continue with the next step (Vendor availability confirm).' },
      });
    }
    const body = req.body || {};
    const {
      verifiedFacts,
      unknowns,
      remainingRisks,
      installWindowStart,
      installWindowEnd,
      consentData,
      partsStrategy,
      clientIp,
      deviceInfo,
      version,
    } = body;
    if (
      !Array.isArray(verifiedFacts) ||
      !Array.isArray(unknowns) ||
      !Array.isArray(remainingRisks) ||
      !consentData ||
      !installWindowStart ||
      !installWindowEnd
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'verifiedFacts, unknowns, remainingRisks, consentData, installWindowStart, installWindowEnd required',
        },
      });
    }
    const payload = {
      verifiedFacts,
      unknowns,
      remainingRisks,
      installWindowStart: new Date(installWindowStart),
      installWindowEnd: new Date(installWindowEnd),
      consentData: typeof consentData === 'object' ? consentData : { accepted: consentData },
      partsStrategy: partsStrategy || 'STATE_A_SUPPLIER_CUSTODY',
      clientIp: clientIp || req.ip || null,
      deviceInfo: deviceInfo || req.get('user-agent') || null,
      version: version || null,
    };
    const auditHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const decisionLock = await prisma.decisionLock.create({
      data: {
        caseId: id,
        ...payload,
        auditHash,
      },
    });
    const receiptPayload = {
      verifiedFacts,
      risksAccepted: remainingRisks,
      unknowns,
      timingPlan: {
        installWindowStart: payload.installWindowStart,
        installWindowEnd: payload.installWindowEnd,
      },
      legalRefs: body.legalRefs || null,
    };
    const receiptHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ ...receiptPayload, decisionLockId: decisionLock.id }))
      .digest('hex');
    await prisma.decisionReceipt.create({
      data: {
        caseId: id,
        decisionLockId: decisionLock.id,
        verifiedFacts,
        risksAccepted: remainingRisks,
        unknowns,
        timingPlan: receiptPayload.timingPlan,
        legalRefs: receiptPayload.legalRefs,
        auditHash: receiptHash,
      },
    });
    await prisma.case.update({
      where: { id },
      data: { state: CASE_STATES.DECISION_LOCKED },
    });
    const updated = await prisma.case.findUnique({
      where: { id },
      include: CASE_INCLUDE,
    });
    res.status(201).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/shop-window-confirm — set state to SHOP_WINDOW_CONFIRMED (after vendor avail). Gate: vendor confirmed.
 */
async function confirmShopWindow(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
      include: { vendorCommitments: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const nextState = CASE_STATES.SHOP_WINDOW_CONFIRMED;
    if (!canTransition(caseRecord.state, nextState)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Parts vendor must confirm availability before the shop can confirm its window. Your case is currently in "${caseRecord.state}". Run "Vendor availability confirm" first.`,
        },
      });
    }
    const updated = await prisma.case.update({
      where: { id },
      data: { state: nextState },
      include: CASE_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/appointment/lock — create appointment and set SHOP_APPOINTMENT_LOCKED. Gate: decision lock + vendor avail + install window accepted.
 */
async function lockAppointment(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
      include: { installWindows: true, decisionLocks: true, vendorCommitments: true, shop: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    if (!canLockAppointment(caseRecord)) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            'Appointment lock not allowed: need vendor availability confirmed, decision lock, and accepted install window',
        },
      });
    }
    const { slotStart, slotEnd } = req.body || {};
    if (!slotStart || !slotEnd) {
      return res.status(400).json({
        success: false,
        error: { message: 'slotStart and slotEnd (ISO dates) required' },
      });
    }
    if (!caseRecord.shopId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Case has no shop assigned' },
      });
    }
    const decisionLockId = caseRecord.decisionLocks[0]?.id;
    const [appointment] = await prisma.$transaction([
      prisma.appointment.create({
        data: {
          caseId: id,
          shopId: caseRecord.shopId,
          decisionLockId,
          slotStart: new Date(slotStart),
          slotEnd: new Date(slotEnd),
          status: 'locked',
        },
      }),
      prisma.case.update({
        where: { id },
        data: { state: CASE_STATES.SHOP_APPOINTMENT_LOCKED },
      }),
    ]);
    const updated = await prisma.case.findUnique({
      where: { id },
      include: CASE_INCLUDE,
    });
    res.status(201).json({ success: true, data: { appointment, case: updated } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/install-start — set state to INSTALL_IN_PROGRESS. Gate: delivery confirmed (DELIVERED).
 */
async function startInstall(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
      include: { shipments: true },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const nextState = CASE_STATES.INSTALL_IN_PROGRESS;
    if (!canTransition(caseRecord.state, nextState)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Parts must be delivered to the shop before install can start. Your case is currently in "${caseRecord.state}". Run "Shipment delivered" first.`,
        },
      });
    }
    if (!canStartInstall(caseRecord)) {
      return res.status(400).json({
        success: false,
        error: { message: 'All parts shipments must be marked as delivered before the shop can start the install.' },
      });
    }
    const updated = await prisma.case.update({
      where: { id },
      data: { state: nextState },
      include: CASE_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/install-complete — set state to INSTALLED.
 */
async function completeInstall(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const nextState = CASE_STATES.INSTALLED;
    if (!canTransition(caseRecord.state, nextState)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `The shop must have started the install before you can complete it. Your case is currently in "${caseRecord.state}". Run "Install start" first.`,
        },
      });
    }
    const updated = await prisma.case.update({
      where: { id },
      data: { state: nextState },
      include: CASE_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/post-confirmation — set state to POST_CONFIRMATION_COMPLETE. Gate: state must be INSTALLED.
 */
async function postConfirmation(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const nextState = CASE_STATES.POST_CONFIRMATION_COMPLETE;
    if (!canTransition(caseRecord.state, nextState)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Install must be completed before post-confirmation. Your case is currently in "${caseRecord.state}". Run "Install complete" first.`,
        },
      });
    }
    const updated = await prisma.case.update({
      where: { id },
      data: { state: nextState, completedAt: new Date() },
      include: CASE_INCLUDE,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /cases/:id/exceptions — record a case exception. Body: { type, payload? }
 */
async function createException(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    const caseRecord = await prisma.case.findFirst({
      where: { id, userId },
    });
    if (!caseRecord) {
      return res.status(404).json({ success: false, error: { message: 'Case not found' } });
    }
    const { type, payload } = req.body || {};
    if (!type || !EXCEPTION_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: `type must be one of: ${EXCEPTION_TYPES.join(', ')}` },
      });
    }
    const exceptionState = `EXCEPTION_${type}`;
    const [ex, updated] = await prisma.$transaction([
      prisma.caseException.create({
        data: { caseId: id, type, payload: payload || null },
      }),
      prisma.case.update({
        where: { id },
        data: { state: exceptionState },
        include: CASE_INCLUDE,
      }),
    ]);
    res.status(201).json({ success: true, data: { exception: ex, case: updated } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  verify,
  proposeInstallWindow,
  acceptInstallWindow,
  createDecisionLock,
  confirmShopWindow,
  lockAppointment,
  startInstall,
  completeInstall,
  postConfirmation,
  createException,
};
