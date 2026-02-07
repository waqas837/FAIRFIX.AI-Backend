const express = require('express');
const { list, getById } = require('../controllers/vehicleController');
const { listByVehicle, getLatest } = require('../controllers/scanController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireUser, list);
router.get('/:id', authenticate, requireUser, getById);
router.get('/:vehicleId/scans', authenticate, requireUser, listByVehicle);
router.get('/:vehicleId/scans/latest', authenticate, requireUser, getLatest);

module.exports = router;
