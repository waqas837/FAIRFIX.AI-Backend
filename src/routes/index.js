const express = require('express');
const { authenticate } = require('../middleware/auth');

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

const router = express.Router();

router.use(authenticate);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() });
});

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

module.exports = router;
