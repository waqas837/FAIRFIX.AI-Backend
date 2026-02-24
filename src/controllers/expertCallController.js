const { prisma } = require('../config/database');
const { createExpertCallPaymentIntent, createExpertCallLedgerEntry, transferToExpert, EXPERT_CALL_PRICE_CENTS } = require('../utils/stripeHelpers');
const { createZoomMeeting, endMeeting } = require('../utils/zoomHelpers');
const { initializeCallState, markCallAsPaid, markCallAsScheduled, markCallAsStarted, markCallAsEnded, canCallStart, isCallPaid } = require('../utils/callStateMachine');

/**
 * GET /expert-calls — list expert calls for current user.
 */
async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const calls = await prisma.expertCall.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        expert: { select: { id: true, name: true, title: true, rating: true } },
      },
    });

    res.json({ success: true, data: calls });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /expert-calls/:id — expert call by id (must belong to current user).
 */
async function getById(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const call = await prisma.expertCall.findFirst({
      where: { id, userId },
      include: { expert: true },
    });

    if (!call) {
      return res.status(404).json({ success: false, error: { message: 'Expert call not found' } });
    }

    res.json({ success: true, data: call });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /expert-calls — create new expert call with payment
 */
async function create(req, res, next) {
  try {
    const userId = req.user?.id;
    const { expertId, vehicleId, type, scheduledTime } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    if (!expertId) {
      return res.status(400).json({ success: false, error: { message: 'Expert ID is required' } });
    }

    // Verify expert exists and is available
    const expert = await prisma.expert.findUnique({ where: { id: expertId } });
    if (!expert) {
      return res.status(404).json({ success: false, error: { message: 'Expert not found' } });
    }

    if (expert.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: { message: 'Expert is not available' } });
    }

    // Create expert call
    const expertCall = await prisma.expertCall.create({
      data: {
        userId,
        expertId,
        vehicleId,
        type: type || 'scheduled',
        cost: EXPERT_CALL_PRICE_CENTS / 100
      }
    });

    // Initialize call state
    await initializeCallState(expertCall.id, userId);

    // Create payment intent
    const paymentIntent = await createExpertCallPaymentIntent(userId, expertId, expertCall.id);

    res.status(201).json({
      success: true,
      data: {
        expertCall,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /expert-calls/:id/confirm-payment — confirm payment and transition to PAID state
 */
async function confirmPayment(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { paymentIntentId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const expertCall = await prisma.expertCall.findFirst({
      where: { id, userId }
    });

    if (!expertCall) {
      return res.status(404).json({ success: false, error: { message: 'Expert call not found' } });
    }

    // Create ledger entry
    await createExpertCallLedgerEntry(
      { id: paymentIntentId, amount: EXPERT_CALL_PRICE_CENTS, charges: { data: [] } },
      expertCall.id,
      userId,
      expertCall.expertId
    );

    // Transition to PAID state
    await markCallAsPaid(expertCall.id, paymentIntentId, userId);

    res.json({ success: true, message: 'Payment confirmed' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /expert-calls/:id/schedule — schedule call and create Zoom meeting
 */
async function schedule(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { scheduledTime } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const expertCall = await prisma.expertCall.findFirst({
      where: { id, userId },
      include: { expert: true }
    });

    if (!expertCall) {
      return res.status(404).json({ success: false, error: { message: 'Expert call not found' } });
    }

    // Verify payment
    const paid = await isCallPaid(expertCall.id);
    if (!paid) {
      return res.status(400).json({ success: false, error: { message: 'Call must be paid before scheduling' } });
    }

    // Create Zoom meeting
    const meeting = await createZoomMeeting(
      expertCall.id,
      expertCall.expertId,
      `Expert Consultation with ${expertCall.expert.name}`,
      scheduledTime,
      30
    );

    // Transition to SCHEDULED state
    await markCallAsScheduled(expertCall.id, scheduledTime, meeting.id.toString(), userId);

    res.json({
      success: true,
      data: {
        meetingId: meeting.id,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        password: meeting.password
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /expert-calls/:id/start — start call
 */
async function start(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const expertCall = await prisma.expertCall.findFirst({
      where: { id, OR: [{ userId }, { expert: { userId } }] }
    });

    if (!expertCall) {
      return res.status(404).json({ success: false, error: { message: 'Expert call not found' } });
    }

    // Verify call can start
    const canStart = await canCallStart(expertCall.id);
    if (!canStart) {
      return res.status(400).json({ success: false, error: { message: 'Call is not in SCHEDULED state' } });
    }

    // Transition to STARTED state
    await markCallAsStarted(expertCall.id, userId);

    res.json({ success: true, message: 'Call started' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /expert-calls/:id/end — end call
 */
async function end(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const expertCall = await prisma.expertCall.findFirst({
      where: { id, OR: [{ userId }, { expert: { userId } }] },
      include: { zoomMeeting: true }
    });

    if (!expertCall) {
      return res.status(404).json({ success: false, error: { message: 'Expert call not found' } });
    }

    // End Zoom meeting
    if (expertCall.zoomMeeting) {
      await endMeeting(expertCall.zoomMeeting.meetingId);
    }

    // Transition to ENDED state
    await markCallAsEnded(expertCall.id, userId);

    // Transfer earnings to expert
    const ledgerEntry = await prisma.ledger.findFirst({
      where: { referenceId: expertCall.id, type: 'expert_call_payment' }
    });

    if (ledgerEntry && ledgerEntry.expertEarningsCents) {
      await transferToExpert(expertCall.expertId, ledgerEntry.expertEarningsCents, expertCall.id);
    }

    res.json({ success: true, message: 'Call ended' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, confirmPayment, schedule, start, end };
