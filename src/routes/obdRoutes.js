const express = require('express');
const router = express.Router();
const obdController = require('../controllers/obdController');
const { authenticate } = require('../middleware/auth');

// All OBD routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /obd/devices:
 *   post:
 *     summary: Link OBD device to vehicle
 *     tags: [OBD]
 *     security:
 *       - bearerAuth: []
 */
router.post('/devices', obdController.linkDevice);

/**
 * @swagger
 * /obd/devices:
 *   get:
 *     summary: List OBD devices for user's vehicles
 *     tags: [OBD]
 *     security:
 *       - bearerAuth: []
 */
router.get('/devices', obdController.listDevices);

/**
 * @swagger
 * /obd/devices/:deviceId:
 *   delete:
 *     summary: Unlink OBD device
 *     tags: [OBD]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/devices/:deviceId', obdController.unlinkDevice);

/**
 * @swagger
 * /obd/scans:
 *   post:
 *     summary: Ingest diagnostic scan data
 *     tags: [OBD]
 *     security:
 *       - bearerAuth: []
 */
router.post('/scans', obdController.ingestScan);

/**
 * @swagger
 * /obd/scans/:vehicleId:
 *   get:
 *     summary: Get scan history for vehicle
 *     tags: [OBD]
 *     security:
 *       - bearerAuth: []
 */
router.get('/scans/:vehicleId', obdController.getScanHistory);

module.exports = router;
