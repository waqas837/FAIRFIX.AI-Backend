const express = require('express');
const { body } = require('express-validator');
const { list, getById, create } = require('../controllers/vehicleController');
const { listByVehicle, getLatest } = require('../controllers/scanController');
const { authenticate, requireUser } = require('../middleware/auth');

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: List user's vehicles
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicles
 *   post:
 *     summary: Create a new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vin:
 *                 type: string
 *               plateNumber:
 *                 type: string
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               mileage:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 */

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 */
router.get('/', authenticate, requireUser, list);
router.get('/:id', authenticate, requireUser, getById);
router.post(
  '/',
  authenticate,
  requireUser,
  [
    body('vin').optional().isLength({ min: 17, max: 17 }).withMessage('VIN must be 17 characters'),
    body('plateNumber').optional().trim().isLength({ max: 20 }),
    body('make').optional().trim().isLength({ max: 50 }),
    body('model').optional().trim().isLength({ max: 50 }),
    body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
    body('mileage').optional().isInt({ min: 0 })
  ],
  validate,
  create
);
/**
 * @swagger
 * /vehicles/{vehicleId}/scans:
 *   get:
 *     summary: Get scans for a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: List of scans
 * /vehicles/{vehicleId}/scans/latest:
 *   get:
 *     summary: Get latest scan for a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Latest scan details
 */
router.get('/:vehicleId/scans', authenticate, requireUser, listByVehicle);
router.get('/:vehicleId/scans/latest', authenticate, requireUser, getLatest);

module.exports = router;
