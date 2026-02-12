/**
 * Case state machine: allowed states and transitions.
 * Client requirement: DO NOT allow skipping or jumping states.
 */

const CASE_STATES = {
  CASE_CREATED: 'CASE_CREATED',
  DECISION_PAUSE_ACTIVE: 'DECISION_PAUSE_ACTIVE',
  VERIFYING: 'VERIFYING',
  VERIFIED_WITH_UNKNOWNS: 'VERIFIED_WITH_UNKNOWNS',
  INSTALL_WINDOW_PROPOSED: 'INSTALL_WINDOW_PROPOSED',
  INSTALL_WINDOW_ACCEPTED: 'INSTALL_WINDOW_ACCEPTED',
  DECISION_LOCKED: 'DECISION_LOCKED',
  VENDOR_AVAIL_CONFIRMED: 'VENDOR_AVAIL_CONFIRMED',
  SHOP_WINDOW_CONFIRMED: 'SHOP_WINDOW_CONFIRMED',
  SHOP_APPOINTMENT_LOCKED: 'SHOP_APPOINTMENT_LOCKED',
  SHIP_TRIGGERED: 'SHIP_TRIGGERED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  INSTALL_IN_PROGRESS: 'INSTALL_IN_PROGRESS',
  INSTALLED: 'INSTALLED',
  POST_CONFIRMATION_COMPLETE: 'POST_CONFIRMATION_COMPLETE',
};

const EXCEPTION_PREFIX = 'EXCEPTION_';

/** Allowed next state from each state (no skip/jump). */
const ALLOWED_TRANSITIONS = {
  [CASE_STATES.CASE_CREATED]: [CASE_STATES.DECISION_PAUSE_ACTIVE, CASE_STATES.VERIFYING],
  [CASE_STATES.DECISION_PAUSE_ACTIVE]: [CASE_STATES.VERIFYING],
  [CASE_STATES.VERIFYING]: [CASE_STATES.VERIFIED_WITH_UNKNOWNS],
  [CASE_STATES.VERIFIED_WITH_UNKNOWNS]: [CASE_STATES.INSTALL_WINDOW_PROPOSED],
  [CASE_STATES.INSTALL_WINDOW_PROPOSED]: [CASE_STATES.INSTALL_WINDOW_ACCEPTED],
  [CASE_STATES.INSTALL_WINDOW_ACCEPTED]: [CASE_STATES.DECISION_LOCKED],
  [CASE_STATES.DECISION_LOCKED]: [CASE_STATES.VENDOR_AVAIL_CONFIRMED],
  [CASE_STATES.VENDOR_AVAIL_CONFIRMED]: [CASE_STATES.SHOP_WINDOW_CONFIRMED],
  [CASE_STATES.SHOP_WINDOW_CONFIRMED]: [CASE_STATES.SHOP_APPOINTMENT_LOCKED],
  [CASE_STATES.SHOP_APPOINTMENT_LOCKED]: [CASE_STATES.SHIP_TRIGGERED],
  [CASE_STATES.SHIP_TRIGGERED]: [CASE_STATES.IN_TRANSIT],
  [CASE_STATES.IN_TRANSIT]: [CASE_STATES.DELIVERED],
  [CASE_STATES.DELIVERED]: [CASE_STATES.INSTALL_IN_PROGRESS],
  [CASE_STATES.INSTALL_IN_PROGRESS]: [CASE_STATES.INSTALLED],
  [CASE_STATES.INSTALLED]: [CASE_STATES.POST_CONFIRMATION_COMPLETE],
  [CASE_STATES.POST_CONFIRMATION_COMPLETE]: [],
};

/** Exception types can be set from many states; we don't restrict from which. */
const EXCEPTION_TYPES = [
  'VENDOR_DELAY', 'BACKORDER', 'CARRIER_EXCEPTION', 'MISSED_WINDOW',
  'APPT_MOVED', 'DAMAGED', 'CANCELLED',
];

function isExceptionState(state) {
  return typeof state === 'string' && state.startsWith(EXCEPTION_PREFIX);
}

function canTransition(fromState, toState) {
  if (isExceptionState(toState)) return true;
  const allowed = ALLOWED_TRANSITIONS[fromState];
  return Array.isArray(allowed) && allowed.includes(toState);
}

/** Gate: decision lock only after install window accepted. */
function canCreateDecisionLock(caseRecord) {
  if (!caseRecord || caseRecord.state !== CASE_STATES.INSTALL_WINDOW_ACCEPTED) return false;
  const hasAcceptedWindow = caseRecord.installWindows?.some(
    (w) => w.status === 'accepted'
  );
  return !!hasAcceptedWindow;
}

/** Gate: appointment lock only after shop window confirmed (and vendor + decision lock already done). */
function canLockAppointment(caseRecord) {
  if (!caseRecord) return false;
  const hasDecisionLock = caseRecord.decisionLocks?.length > 0;
  const hasVendorCommitment = caseRecord.vendorCommitments?.length > 0;
  const accepted = caseRecord.installWindows?.some((w) => w.status === 'accepted');
  return (
    caseRecord.state === CASE_STATES.SHOP_WINDOW_CONFIRMED &&
    hasDecisionLock &&
    hasVendorCommitment &&
    accepted
  );
}

/** Gate: ship trigger only when alerts enabled, tracking exists, webhook registered. */
function canTriggerShipment(shipment) {
  return (
    shipment &&
    shipment.state === 'draft' &&
    shipment.alertsEnabled === true &&
    !!shipment.trackingNumber &&
    shipment.carrierWebhookRegistered === true
  );
}

/** Gate: install start only after delivery confirmed (case has DELIVERED or shipment DELIVERED). */
function canStartInstall(caseRecord) {
  if (!caseRecord) return false;
  if (caseRecord.state !== CASE_STATES.DELIVERED) return false;
  const shipments = caseRecord.shipments || [];
  const allDelivered = shipments.length === 0 || shipments.every((s) => s.state === 'DELIVERED');
  return allDelivered;
}

module.exports = {
  CASE_STATES,
  EXCEPTION_PREFIX,
  EXCEPTION_TYPES,
  isExceptionState,
  canTransition,
  canCreateDecisionLock,
  canLockAppointment,
  canTriggerShipment,
  canStartInstall,
  ALLOWED_TRANSITIONS,
};
