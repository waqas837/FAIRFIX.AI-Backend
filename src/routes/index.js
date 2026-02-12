const express = require('express');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const userRoutes = require('./userRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const shopRoutes = require('./shopRoutes');
const caseRoutes = require('./caseRoutes');
const expertRoutes = require('./expertRoutes');
const scanRoutes = require('./scanRoutes');
const repairRoutes = require('./repairRoutes');
const alertRoutes = require('./alertRoutes');
const orderRoutes = require('./orderRoutes');
const expertCallRoutes = require('./expertCallRoutes');
const towingRoutes = require('./towingRoutes');
const termsRoutes = require('./termsRoutes');
const consentRoutes = require('./consentRoutes');
const dataRequestRoutes = require('./dataRequestRoutes');
const vendorRoutes = require('./vendorRoutes');
const shipmentRoutes = require('./shipmentRoutes');

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 */
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

// Authentication routes (public)
const authRoutes = require('./auth');
router.use('/auth', authRoutes);

// Admin login (public, before auth middleware)
const adminRoutes = require('./adminRoutes');
router.use('/admin', adminRoutes);

// Shipment carrier webhook (public - called by carrier)
const { carrierExceptionWebhook } = require('../controllers/shipmentController');
router.post('/shipments/webhook/carrier-exception', carrierExceptionWebhook);

// All other routes require authentication
router.use(authenticate);

router.use('/terms', termsRoutes);
router.use('/users', userRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/shops', shopRoutes);
router.use('/cases', caseRoutes);
router.use('/experts', expertRoutes);
router.use('/scans', scanRoutes);
router.use('/repairs', repairRoutes);
router.use('/alerts', alertRoutes);
router.use('/orders', orderRoutes);
router.use('/expert-calls', expertCallRoutes);
router.use('/towing', towingRoutes);
router.use('/consent', consentRoutes);
router.use('/data-requests', dataRequestRoutes);
router.use('/vendor', vendorRoutes);
router.use('/shipments', shipmentRoutes);

module.exports = router;
