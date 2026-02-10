const express = require('express');
const { list, getById } = require('../controllers/subscriptionController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: List user's subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscriptions
 * /subscriptions/{id}:
 *   get:
 *     summary: Get subscription by ID
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription details
 */
router.get('/', authenticate, requireUser, list);
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
