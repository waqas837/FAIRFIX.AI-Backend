const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/stripeWebhookController');

/**
 * @swagger
 * /webhooks/stripe:
 *   post:
 *     summary: Stripe webhook handler
 *     tags: [Webhooks]
 *     description: Handles Stripe webhook events for subscriptions and payments
 */
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = router;
