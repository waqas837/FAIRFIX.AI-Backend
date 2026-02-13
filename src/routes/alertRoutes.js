const express = require('express');
const { list, create } = require('../controllers/alertController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: List user's alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of alerts
 *   post:
 *     summary: Create alert (retentionUntil set for 3 months)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               type: { type: string }
 *               vehicleId: { type: string }
 *     responses:
 *       201:
 *         description: Alert created
 */
router.get('/', authenticate, requireUser, list);
router.post('/', authenticate, requireUser, create);

module.exports = router;
