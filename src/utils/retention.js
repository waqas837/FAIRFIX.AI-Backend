/**
 * Retention policy helper — single source of truth for retention periods.
 * Use getRetentionUntil(recordType) when creating records so the retention job can purge them.
 */

/** Retention periods in days (must match jobs/retention.js) */
const RETENTION_DAYS = {
  diagnosticScans: 365,   // 1 year
  expertCalls: 730,       // 2 years
  alerts: 90,             // 3 months
  disputes: 1095,         // 3 years
  supportTickets: 365,    // 1 year
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns the date until which a record should be retained (after this date the retention job may purge it).
 * Call this when creating DiagnosticScan, Alert, ExpertCall, Dispute, or SupportTicket.
 * @param {string} recordType - One of: diagnosticScans, expertCalls, alerts, disputes, supportTickets
 * @returns {Date} retentionUntil date
 */
function getRetentionUntil(recordType) {
  const days = RETENTION_DAYS[recordType];
  if (days == null) {
    throw new Error(`Unknown retention record type: ${recordType}`);
  }
  const d = new Date();
  d.setTime(d.getTime() + days * MS_PER_DAY);
  return d;
}

module.exports = {
  getRetentionUntil,
  RETENTION_DAYS,
};
