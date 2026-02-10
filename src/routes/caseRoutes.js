const express = require('express');
const { list, getById } = require('../controllers/caseController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /cases:
 *   get:
 *     summary: List user's cases
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cases
 * /cases/{id}:
 *   get:
 *     summary: Get case by ID
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case details
 */
router.get('/', authenticate, requireUser, list);
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
