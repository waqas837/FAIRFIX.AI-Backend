const express = require('express');
const { getById } = require('../controllers/scanController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /scans/{id}:
 *   get:
 *     summary: Get scan by ID
 *     tags: [Scans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scan ID
 *     responses:
 *       200:
 *         description: Scan details
 */
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
