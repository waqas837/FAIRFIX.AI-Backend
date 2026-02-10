const { prisma } = require('../config/database');

/**
 * Grant or withdraw consent
 * POST /api/consent
 */
async function manageConsent(req, res) {
  try {
    const { purpose, version, consented } = req.body;
    const userId = req.userId;

    if (!purpose || !version || typeof consented !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { message: 'purpose, version, and consented (boolean) are required' }
      });
    }

    // Validate purpose
    const validPurposes = [
      'diagnostic_data',
      'call_recording',
      'monica_monitoring',
      'ai_summary',
      'post_repair_verification'
    ];

    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Invalid purpose',
          validPurposes 
        }
      });
    }

    // Get client IP and user agent
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const deviceInfo = req.get('device-info') || null;

    // Create consent log entry
    const consentLog = await prisma.consentLog.create({
      data: {
        userId,
        purpose,
        version,
        consented,
        clientIp,
        userAgent,
        deviceInfo
      }
    });

    res.status(201).json({
      success: true,
      message: consented ? 'Consent granted' : 'Consent withdrawn',
      data: { consentLog }
    });
  } catch (error) {
    console.error('Consent management error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get consent history for current user
 * GET /api/consent/history
 */
async function getConsentHistory(req, res) {
  try {
    const userId = req.userId;
    const { purpose } = req.query;

    const where = { userId };
    if (purpose) {
      where.purpose = purpose;
    }

    const consentLogs = await prisma.consentLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        purpose: true,
        version: true,
        consented: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: { consentLogs }
    });
  } catch (error) {
    console.error('Get consent history error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

module.exports = {
  manageConsent,
  getConsentHistory
};
