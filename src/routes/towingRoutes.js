const express = require('express');
const { history, getById } = require('../controllers/towingController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /towing/history:
 *   get:
 *     summary: Get towing request history
 *     tags: [Towing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of towing requests
 * /towing/{id}:
 *   get:
 *     summary: Get towing request by ID
 *     tags: [Towing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Towing request ID
 *     responses:
 *       200:
 *         description: Towing request details
 */
router.get('/history', authenticate, requireUser, history);
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
