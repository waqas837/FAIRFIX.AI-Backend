const express = require('express');
const { list, getById } = require('../controllers/repairController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /repairs:
 *   get:
 *     summary: List user's repairs
 *     tags: [Repairs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of repairs
 * /repairs/{id}:
 *   get:
 *     summary: Get repair by ID
 *     tags: [Repairs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Repair ID
 *     responses:
 *       200:
 *         description: Repair details
 */
router.get('/', authenticate, requireUser, list);
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
