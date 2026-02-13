const cron = require('node-cron');
const { prisma } = require('../config/database');

/**
 * Data Retention and Purge Jobs
 * Automatically deletes data that has exceeded retention periods
 */

/**
 * Retention periods (in days)
 */
const RETENTION_PERIODS = {
  diagnosticScans: 365, // 1 year
  expertCalls: 730, // 2 years
  alerts: 90, // 3 months
  disputes: 1095, // 3 years
  supportTickets: 365, // 1 year
  auditLogs: 2555, // 7 years (compliance requirement)
  consentLogs: 2555, // 7 years (compliance requirement)
};

/**
 * Purge expired diagnostic scans (retentionUntil in the past, or no retentionUntil and createdAt past policy)
 */
async function purgeDiagnosticScans() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.diagnosticScans);

    const result = await prisma.diagnosticScan.deleteMany({
      where: {
        OR: [
          { retentionUntil: { lte: cutoffDate } },
          { retentionUntil: null, scannedAt: { lte: cutoffDate } }
        ]
      }
    });

    console.log(`[Retention Job] Purged ${result.count} expired diagnostic scans`);
    return result.count;
  } catch (error) {
    console.error('[Retention Job] Error purging diagnostic scans:', error);
    throw error;
  }
}

/**
 * Purge expired expert calls (retentionUntil in the past, or no retentionUntil and createdAt past policy)
 */
async function purgeExpertCalls() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.expertCalls);

    const result = await prisma.expertCall.deleteMany({
      where: {
        OR: [
          { retentionUntil: { lte: cutoffDate } },
          { retentionUntil: null, createdAt: { lte: cutoffDate } }
        ]
      }
    });

    console.log(`[Retention Job] Purged ${result.count} expired expert calls`);
    return result.count;
  } catch (error) {
    console.error('[Retention Job] Error purging expert calls:', error);
    throw error;
  }
}

/**
 * Purge expired alerts (retentionUntil in the past, or no retentionUntil and createdAt past policy)
 */
async function purgeAlerts() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.alerts);

    const result = await prisma.alert.deleteMany({
      where: {
        OR: [
          { retentionUntil: { lte: cutoffDate } },
          { retentionUntil: null, createdAt: { lte: cutoffDate } }
        ]
      }
    });

    console.log(`[Retention Job] Purged ${result.count} expired alerts`);
    return result.count;
  } catch (error) {
    console.error('[Retention Job] Error purging alerts:', error);
    throw error;
  }
}

/**
 * Purge expired disputes (retentionUntil in the past, or no retentionUntil and createdAt past policy)
 */
async function purgeDisputes() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.disputes);

    const result = await prisma.dispute.deleteMany({
      where: {
        OR: [
          { retentionUntil: { lte: cutoffDate } },
          { retentionUntil: null, createdAt: { lte: cutoffDate } }
        ]
      }
    });

    console.log(`[Retention Job] Purged ${result.count} expired disputes`);
    return result.count;
  } catch (error) {
    console.error('[Retention Job] Error purging disputes:', error);
    throw error;
  }
}

/**
 * Purge expired support tickets (retentionUntil in the past, or no retentionUntil and createdAt past policy)
 */
async function purgeSupportTickets() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.supportTickets);

    const result = await prisma.supportTicket.deleteMany({
      where: {
        OR: [
          { retentionUntil: { lte: cutoffDate } },
          { retentionUntil: null, createdAt: { lte: cutoffDate } }
        ]
      }
    });

    console.log(`[Retention Job] Purged ${result.count} expired support tickets`);
    return result.count;
  } catch (error) {
    console.error('[Retention Job] Error purging support tickets:', error);
    throw error;
  }
}

/**
 * Run all retention purge jobs
 */
async function runRetentionPurge() {
  console.log('[Retention Job] Starting retention purge...');
  const startTime = Date.now();

  try {
    const results = {
      diagnosticScans: await purgeDiagnosticScans(),
      expertCalls: await purgeExpertCalls(),
      alerts: await purgeAlerts(),
      disputes: await purgeDisputes(),
      supportTickets: await purgeSupportTickets(),
    };

    const totalPurged = Object.values(results).reduce((sum, count) => sum + count, 0);
    const duration = Date.now() - startTime;

    console.log(`[Retention Job] Completed in ${duration}ms. Total records purged: ${totalPurged}`);
    return results;
  } catch (error) {
    console.error('[Retention Job] Retention purge failed:', error);
    throw error;
  }
}

/**
 * Schedule retention purge job
 * Runs daily at 2 AM
 */
function scheduleRetentionPurge() {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[Retention Job] Scheduled retention purge started');
    await runRetentionPurge();
  });

  console.log('[Retention Job] Scheduled retention purge job (daily at 2:00 AM)');
}

module.exports = {
  runRetentionPurge,
  scheduleRetentionPurge,
  purgeDiagnosticScans,
  purgeExpertCalls,
  purgeAlerts,
  purgeDisputes,
  purgeSupportTickets,
  RETENTION_PERIODS
};
