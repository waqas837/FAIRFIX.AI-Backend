const express = require('express');
const { list, getById } = require('../controllers/orderController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: List user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 */
router.get('/', authenticate, requireUser, list);
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
