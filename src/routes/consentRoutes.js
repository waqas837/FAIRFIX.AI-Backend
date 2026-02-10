const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consentController');
const { authenticate, requireUser } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { dataRequestLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(authenticate);
router.use(requireUser);

/**
 * @swagger
 * /consent:
 *   post:
 *     summary: Grant or withdraw consent
 *     tags: [Consent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purpose
 *               - version
 *               - consented
 *             properties:
 *               purpose:
 *                 type: string
 *                 enum: [diagnostic_data, call_recording, monica_monitoring, ai_summary, post_repair_verification]
 *               version:
 *                 type: string
 *               consented:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Consent updated successfully
 */
router.post(
  '/',
  dataRequestLimiter,
  auditLog('consent_change', 'user'),
  consentController.manageConsent
);

/**
 * @swagger
 * /consent/history:
 *   get:
 *     summary: Get consent history
 *     tags: [Consent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consent history retrieved successfully
 */
router.get('/history', consentController.getConsentHistory);

module.exports = router;
