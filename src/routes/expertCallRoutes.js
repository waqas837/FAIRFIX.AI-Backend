const express = require('express');
const { list, getById } = require('../controllers/expertCallController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /expert-calls:
 *   get:
 *     summary: List user's expert calls
 *     tags: [Expert Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expert calls
 * /expert-calls/{id}:
 *   get:
 *     summary: Get expert call by ID
 *     tags: [Expert Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expert call ID
 *     responses:
 *       200:
 *         description: Expert call details
 */
router.get('/', authenticate, requireUser, list);
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
