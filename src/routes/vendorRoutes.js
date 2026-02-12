const express = require('express');
const { list, availabilityConfirm } = require('../controllers/vendorController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /vendor:
 *   get:
 *     summary: List vendors (for case flow – Vendor availability confirm step)
 *     tags: [Vendor]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of vendors (id, name)
 */
router.get('/', authenticate, requireUser, list);

/**
 * @swagger
 * /vendor/availability-confirm:
 *   post:
 *     summary: Confirm vendor availability for a case (creates VendorFulfillmentCommitment, sets case to VENDOR_AVAIL_CONFIRMED)
 *     tags: [Vendor]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [caseId, vendorId, sku, quantity, available, validUntil]
 *             properties:
 *               caseId: { type: string }
 *               vendorId: { type: string }
 *               sku: { type: string }
 *               quantity: { type: integer }
 *               available: { type: boolean }
 *               validUntil: { type: string, format: date-time }
 *               leadTimeMinDays: { type: integer }
 *               leadTimeMaxDays: { type: integer }
 *               serviceLevel: { type: string }
 *               cutoffTime: { type: string, format: date-time }
 *               backorderRisk: { type: boolean }
 *               confirmationRef: { type: string }
 *     responses:
 *       201: { description: Commitment created, case updated }
 *       400: { description: 'Missing required fields or case not in DECISION_LOCKED state' }
 *       404: { description: 'Case not found or Vendor not found (run node scripts/seed-vendors.js to create a test vendor)' }
 */
router.post('/availability-confirm', authenticate, requireUser, availabilityConfirm);

module.exports = router;
