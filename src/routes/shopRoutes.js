const express = require('express');
const { list, getById, getReviews, addCapacityWindow } = require('../controllers/shopController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /shops:
 *   get:
 *     summary: List all shops
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shops
 * /shops/{id}:
 *   get:
 *     summary: Get shop by ID
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop details
 * /shops/{id}/reviews:
 *   get:
 *     summary: Get shop reviews
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/', list);
router.get('/:id', getById);
router.get('/:id/reviews', getReviews);
/**
 * @swagger
 * /shops/{id}/capacity-window:
 *   post:
 *     summary: Add shop capacity window (earliest/latest + constraints)
 *     tags: [Shops]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string }, description: Shop ID }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [earliestAt, latestAt], properties: { earliestAt: { type: string, format: date-time }, latestAt: { type: string, format: date-time }, constraints: {} } }
 *     responses:
 *       201: { description: Capacity window created }
 */
router.post('/:id/capacity-window', authenticate, requireUser, addCapacityWindow);

module.exports = router;
