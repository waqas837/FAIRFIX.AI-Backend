const express = require('express');
const { list } = require('../controllers/alertController');
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
 */
router.get('/', authenticate, requireUser, list);

module.exports = router;
