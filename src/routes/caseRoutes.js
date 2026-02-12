const express = require('express');
const {
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
} = require('../controllers/caseController');
const { createShipment } = require('../controllers/shipmentController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /cases:
 *   get:
 *     summary: List user's cases
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by case state
 *     responses:
 *       200: { description: List of cases }
 *   post:
 *     summary: Create a new case (vehicle and shop required)
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, shopId]
 *             properties:
 *               vehicleId: { type: string, description: 'ID of user''s vehicle' }
 *               shopId: { type: string, description: 'ID of approved shop' }
 *     responses:
 *       201: { description: Case created }
 *       400: { description: 'Vehicle and shop required; or vehicle/shop not found or not valid' }
 */
router.get('/', authenticate, requireUser, list);
/**
 * @swagger
 * /cases/{id}:
 *   get:
 *     summary: Get case by ID
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Case details }
 *       404: { description: Case not found }
 */
router.get('/:id', authenticate, requireUser, getById);

router.post('/', authenticate, requireUser, create);
/**
 * @swagger
 * /cases/{id}/verify:
 *   post:
 *     summary: Verify case (move to VERIFYING or VERIFIED_WITH_UNKNOWNS)
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verified: { type: boolean, description: 'Set true to move to VERIFIED_WITH_UNKNOWNS' }
 *               diagnosticSummary: {}
 *               recommendedParts: {}
 *               laborEstimateHours: { type: number }
 *     responses:
 *       200: { description: Case updated }
 *       400: { description: 'Invalid state – run steps in order; error message includes current state and what to run first' }
 */
router.post('/:id/verify', authenticate, requireUser, verify);
/**
 * @swagger
 * /cases/{id}/install-window/propose:
 *   post:
 *     summary: Propose install window
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [startAt, endAt], properties: { startAt: { type: string, format: date-time }, endAt: { type: string, format: date-time } } }
 *     responses:
 *       201: { description: Install window proposed }
 *       400: { description: 'Invalid state – complete Verify (done) first, or run Accept install window next if already proposed' }
 */
router.post('/:id/install-window/propose', authenticate, requireUser, proposeInstallWindow);
/**
 * @swagger
 * /cases/{id}/install-window/accept:
 *   post:
 *     summary: Accept install window
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [installWindowId], properties: { installWindowId: { type: string } } }
 *     responses:
 *       200: { description: Window accepted }
 *       400: { description: 'installWindowId required – run Propose install window first; or invalid state' }
 */
router.post('/:id/install-window/accept', authenticate, requireUser, acceptInstallWindow);
/**
 * @swagger
 * /cases/{id}/decision-lock:
 *   post:
 *     summary: Create decision lock (and auto decision receipt). Requires accepted install window.
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verifiedFacts, unknowns, remainingRisks, consentData, installWindowStart, installWindowEnd]
 *             properties:
 *               verifiedFacts: { type: array, items: {} }
 *               unknowns: { type: array, items: {} }
 *               remainingRisks: { type: array, items: {} }
 *               consentData: {}
 *               installWindowStart: { type: string, format: date-time }
 *               installWindowEnd: { type: string, format: date-time }
 *               partsStrategy: { type: string }
 *               clientIp: { type: string }
 *               deviceInfo: { type: string }
 *               version: { type: string }
 *     responses:
 *       201: { description: Decision lock created }
 */
router.post('/:id/decision-lock', authenticate, requireUser, createDecisionLock);
/**
 * @swagger
 * /cases/{id}/shop-window-confirm:
 *   post:
 *     summary: Confirm shop window (state SHOP_WINDOW_CONFIRMED). Requires vendor availability.
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Case updated }
 */
router.post('/:id/shop-window-confirm', authenticate, requireUser, confirmShopWindow);
/**
 * @swagger
 * /cases/{id}/appointment/lock:
 *   post:
 *     summary: Lock appointment. Requires decision lock + vendor availability + shop window confirmed.
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [slotStart, slotEnd], properties: { slotStart: { type: string, format: date-time }, slotEnd: { type: string, format: date-time } } }
 *     responses:
 *       201: { description: Appointment locked }
 */
router.post('/:id/appointment/lock', authenticate, requireUser, lockAppointment);
/**
 * @swagger
 * /cases/{id}/install-start:
 *   post:
 *     summary: Start install (state INSTALL_IN_PROGRESS). Requires delivery confirmed.
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Case updated }
 */
router.post('/:id/install-start', authenticate, requireUser, startInstall);
/**
 * @swagger
 * /cases/{id}/install-complete:
 *   post:
 *     summary: Complete install (state INSTALLED)
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Case updated }
 */
router.post('/:id/install-complete', authenticate, requireUser, completeInstall);
/**
 * @swagger
 * /cases/{id}/post-confirmation:
 *   post:
 *     summary: Post-confirmation complete (state POST_CONFIRMATION_COMPLETE)
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Case updated }
 */
router.post('/:id/post-confirmation', authenticate, requireUser, postConfirmation);
/**
 * @swagger
 * /cases/{id}/exceptions:
 *   post:
 *     summary: Record case exception (VENDOR_DELAY, BACKORDER, CARRIER_EXCEPTION, etc.)
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, required: [type], properties: { type: { type: string, enum: [VENDOR_DELAY, BACKORDER, CARRIER_EXCEPTION, MISSED_WINDOW, APPT_MOVED, DAMAGED, CANCELLED] }, payload: {} } }
 *     responses:
 *       201: { description: Exception recorded }
 */
router.post('/:id/exceptions', authenticate, requireUser, createException);
/**
 * @swagger
 * /cases/{id}/shipments:
 *   post:
 *     summary: Create draft shipment for case
 *     tags: [Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { trackingNumber: { type: string }, alertsEnabled: { type: boolean }, carrierWebhookRegistered: { type: boolean } } }
 *     responses:
 *       201: { description: Shipment created }
 */
router.post('/:id/shipments', authenticate, requireUser, createShipment);

module.exports = router;
