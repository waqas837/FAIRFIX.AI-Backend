const { prisma } = require('../config/database');

// Call lifecycle states
const CALL_STATES = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  SCHEDULED: 'SCHEDULED',
  STARTED: 'STARTED',
  ENDED: 'ENDED',
  RECORDED: 'RECORDED',
  CLOSED: 'CLOSED'
};

// Valid state transitions
const VALID_TRANSITIONS = {
  CREATED: ['PAID'],
  PAID: ['SCHEDULED'],
  SCHEDULED: ['STARTED'],
  STARTED: ['ENDED'],
  ENDED: ['RECORDED', 'CLOSED'], // Can skip RECORDED if no recording
  RECORDED: ['CLOSED'],
  CLOSED: [] // Terminal state
};

/**
 * Initialize call state
 */
async function initializeCallState(expertCallId, transitionedBy = 'system') {
  const existingState = await prisma.callState.findUnique({
    where: { expertCallId }
  });

  if (existingState) {
    return existingState;
  }

  return await prisma.callState.create({
    data: {
      expertCallId,
      state: CALL_STATES.CREATED,
      previousState: null,
      transitionedBy,
      metadata: {}
    }
  });
}

/**
 * Get current call state
 */
async function getCurrentCallState(expertCallId) {
  const callState = await prisma.callState.findUnique({
    where: { expertCallId }
  });

  if (!callState) {
    throw new Error('Call state not found');
  }

  return callState;
}

/**
 * Validate state transition
 */
function isValidTransition(currentState, newState) {
  const allowedStates = VALID_TRANSITIONS[currentState];
  return allowedStates && allowedStates.includes(newState);
}

/**
 * Transition call state
 */
async function transitionCallState(expertCallId, newState, transitionedBy, metadata = {}) {
  const currentCallState = await getCurrentCallState(expertCallId);

  if (currentCallState.state === newState) {
    return currentCallState; // Already in this state
  }

  if (!isValidTransition(currentCallState.state, newState)) {
    throw new Error(
      `Invalid state transition from ${currentCallState.state} to ${newState}. ` +
      `Allowed transitions: ${VALID_TRANSITIONS[currentCallState.state].join(', ')}`
    );
  }

  const updatedState = await prisma.callState.update({
    where: { expertCallId },
    data: {
      previousState: currentCallState.state,
      state: newState,
      transitionedBy,
      transitionedAt: new Date(),
      metadata: {
        ...currentCallState.metadata,
        ...metadata,
        lastTransition: {
          from: currentCallState.state,
          to: newState,
          at: new Date().toISOString(),
          by: transitionedBy
        }
      }
    }
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: transitionedBy !== 'system' ? transitionedBy : null,
      action: 'call_state_transition',
      resourceType: 'expert_call',
      resourceId: expertCallId,
      metadata: {
        previousState: currentCallState.state,
        newState,
        transitionedBy
      }
    }
  });

  return updatedState;
}

/**
 * Mark call as paid
 */
async function markCallAsPaid(expertCallId, paymentIntentId, transitionedBy) {
  return await transitionCallState(
    expertCallId,
    CALL_STATES.PAID,
    transitionedBy,
    { paymentIntentId, paidAt: new Date().toISOString() }
  );
}

/**
 * Mark call as scheduled
 */
async function markCallAsScheduled(expertCallId, scheduledTime, meetingId, transitionedBy) {
  return await transitionCallState(
    expertCallId,
    CALL_STATES.SCHEDULED,
    transitionedBy,
    { scheduledTime, meetingId, scheduledAt: new Date().toISOString() }
  );
}

/**
 * Mark call as started
 */
async function markCallAsStarted(expertCallId, transitionedBy) {
  await transitionCallState(
    expertCallId,
    CALL_STATES.STARTED,
    transitionedBy,
    { startedAt: new Date().toISOString() }
  );

  // Update ExpertCall record
  await prisma.expertCall.update({
    where: { id: expertCallId },
    data: { startedAt: new Date() }
  });
}

/**
 * Mark call as ended
 */
async function markCallAsEnded(expertCallId, transitionedBy) {
  await transitionCallState(
    expertCallId,
    CALL_STATES.ENDED,
    transitionedBy,
    { endedAt: new Date().toISOString() }
  );

  // Update ExpertCall record
  await prisma.expertCall.update({
    where: { id: expertCallId },
    data: { endedAt: new Date() }
  });
}

/**
 * Mark call as recorded
 */
async function markCallAsRecorded(expertCallId, recordingUrl, transitionedBy) {
  return await transitionCallState(
    expertCallId,
    CALL_STATES.RECORDED,
    transitionedBy,
    { recordingUrl, recordedAt: new Date().toISOString() }
  );
}

/**
 * Mark call as closed
 */
async function markCallAsClosed(expertCallId, transitionedBy, reason = null) {
  return await transitionCallState(
    expertCallId,
    CALL_STATES.CLOSED,
    transitionedBy,
    { closedAt: new Date().toISOString(), closureReason: reason }
  );
}

/**
 * Check if call can start (must be in SCHEDULED state)
 */
async function canCallStart(expertCallId) {
  const callState = await getCurrentCallState(expertCallId);
  return callState.state === CALL_STATES.SCHEDULED;
}

/**
 * Check if call is paid
 */
async function isCallPaid(expertCallId) {
  const callState = await getCurrentCallState(expertCallId);
  return [CALL_STATES.PAID, CALL_STATES.SCHEDULED, CALL_STATES.STARTED, CALL_STATES.ENDED, CALL_STATES.RECORDED, CALL_STATES.CLOSED].includes(callState.state);
}

/**
 * Force close call (admin only)
 */
async function forceCloseCall(expertCallId, adminUserId, reason) {
  const currentState = await getCurrentCallState(expertCallId);

  // Force transition to CLOSED regardless of current state
  const closedState = await prisma.callState.update({
    where: { expertCallId },
    data: {
      previousState: currentState.state,
      state: CALL_STATES.CLOSED,
      transitionedBy: adminUserId,
      transitionedAt: new Date(),
      metadata: {
        ...currentState.metadata,
        forceClosed: true,
        forceClosedReason: reason,
        forceClosedAt: new Date().toISOString(),
        forceClosedBy: adminUserId
      }
    }
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'force_close_call',
      resourceType: 'expert_call',
      resourceId: expertCallId,
      metadata: {
        previousState: currentState.state,
        reason
      }
    }
  });

  return closedState;
}

module.exports = {
  CALL_STATES,
  VALID_TRANSITIONS,
  initializeCallState,
  getCurrentCallState,
  isValidTransition,
  transitionCallState,
  markCallAsPaid,
  markCallAsScheduled,
  markCallAsStarted,
  markCallAsEnded,
  markCallAsRecorded,
  markCallAsClosed,
  canCallStart,
  isCallPaid,
  forceCloseCall
};
