const express = require('express');
const { list, getById, create, confirmPayment, schedule, start, end } = require('../controllers/expertCallController');
const { authenticate, requireUser } = require('../middleware/auth');
const { requireConsent } = require('../middleware/consent');

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
router.get('/', authenticate, requireUser, requireConsent('call_recording'), list);
router.get('/:id', authenticate, requireUser, requireConsent('call_recording'), getById);
router.post('/', authenticate, requireUser, requireConsent('call_recording'), create);
router.post('/:id/confirm-payment', authenticate, requireUser, confirmPayment);
router.post('/:id/schedule', authenticate, requireUser, schedule);
router.post('/:id/start', authenticate, requireUser, start);
router.post('/:id/end', authenticate, requireUser, end);

module.exports = router;
