const express = require('express');
const { list, getById, getReviews } = require('../controllers/shopController');

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

module.exports = router;
