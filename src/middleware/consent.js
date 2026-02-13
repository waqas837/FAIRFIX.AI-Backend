const { prisma } = require('../config/database');

/** Valid consent purposes (must match consentController and ConsentLog schema) */
const VALID_PURPOSES = [
  'diagnostic_data',
  'call_recording',
  'monica_monitoring',
  'ai_summary',
  'post_repair_verification'
];

/**
 * Middleware: require that the current user has granted consent for the given purpose.
 * Uses the latest consent log entry for that purpose; if consented === true, allows the request; otherwise 403.
 * Must be used after authenticate + requireUser (req.userId set).
 */
function requireConsent(purpose) {
  if (!VALID_PURPOSES.includes(purpose)) {
    throw new Error(`Invalid consent purpose: ${purpose}`);
  }

  return async function (req, res, next) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      const latest = await prisma.consentLog.findFirst({
        where: { userId, purpose },
        orderBy: { createdAt: 'desc' },
        select: { consented: true }
      });

      if (!latest || !latest.consented) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Consent required for this action',
            code: 'CONSENT_REQUIRED',
            purpose
          }
        });
      }

      next();
    } catch (err) {
      console.error('Consent check error:', err);
      res.status(500).json({
        success: false,
        error: { message: 'Consent check failed', details: err.message }
      });
    }
  };
}

module.exports = { requireConsent, VALID_PURPOSES };
