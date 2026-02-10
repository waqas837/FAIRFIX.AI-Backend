const express = require('express');
const { list, getById } = require('../controllers/expertController');

const router = express.Router();

/**
 * @swagger
 * /experts:
 *   get:
 *     summary: List all experts
 *     tags: [Experts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of experts
 * /experts/{id}:
 *   get:
 *     summary: Get expert by ID
 *     tags: [Experts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expert ID
 *     responses:
 *       200:
 *         description: Expert details
 */
router.get('/', list);
router.get('/:id', getById);

module.exports = router;
