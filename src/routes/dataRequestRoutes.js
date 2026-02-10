const express = require('express');
const router = express.Router();
const dataRequestController = require('../controllers/dataRequestController');
const { authenticate, requireUser } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { dataRequestLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(authenticate);
router.use(requireUser);

/**
 * @swagger
 * /data-requests:
 *   post:
 *     summary: Create data export or deletion request
 *     tags: [Data Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [export, delete]
 *     responses:
 *       201:
 *         description: Data request created successfully
 *   get:
 *     summary: List data requests
 *     tags: [Data Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of data requests
 */
router.post(
  '/',
  dataRequestLimiter,
  auditLog('data_request', 'user'),
  dataRequestController.createDataRequest
);

router.get('/', dataRequestController.listDataRequests);

/**
 * @swagger
 * /data-requests/{id}:
 *   get:
 *     summary: Get data request status
 *     tags: [Data Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Data request ID
 *     responses:
 *       200:
 *         description: Data request details
 */
router.get('/:id', dataRequestController.getDataRequest);

module.exports = router;
