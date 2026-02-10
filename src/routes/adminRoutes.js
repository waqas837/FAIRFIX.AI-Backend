const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');
const { authenticate, requireUser } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { auditLog } = require('../middleware/audit');
const { authLimiter } = require('../middleware/rateLimit');

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Admin login (Admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Access denied - Admin role required
 */
// Admin login - public endpoint (no auth required)
router.post('/login', authLimiter, adminAuthController.adminLogin);

// All other admin routes require authentication and admin role
router.use(authenticate);
router.use(requireUser);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Get audit logs (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 * /admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 * /admin/disputes:
 *   get:
 *     summary: Get all disputes (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of disputes
 * /admin/disputes/{id}:
 *   get:
 *     summary: Get dispute by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dispute ID
 *     responses:
 *       200:
 *         description: Dispute details
 * /admin/support-tickets:
 *   get:
 *     summary: Get all support tickets (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of support tickets
 * /admin/support-tickets/{id}:
 *   get:
 *     summary: Get support ticket by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Support ticket ID
 *     responses:
 *       200:
 *         description: Support ticket details
 * /admin/stats:
 *   get:
 *     summary: Get system statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 */
router.get(
  '/audit-logs',
  auditLog('audit_log_view', 'audit_log'),
  adminController.getAuditLogs
);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);

router.get('/disputes', adminController.getDisputes);
router.get('/disputes/:id', adminController.getDisputeById);

router.get('/support-tickets', adminController.getSupportTickets);
router.get('/support-tickets/:id', adminController.getSupportTicketById);

router.get('/stats', adminController.getStats);

module.exports = router;
