const { errorHandler } = require('./errorHandler');
const { authenticate, requireUser } = require('./auth');
const { validate } = require('./validation');
const { requireRole, requireAdmin, requireShopOwner, requireExpert, requireCustomer } = require('./rbac');
const { auditLog } = require('./audit');
const { apiLimiter, authLimiter, dataRequestLimiter } = require('./rateLimit');

module.exports = {
  errorHandler,
  authenticate,
  requireUser,
  validate,
  requireRole,
  requireAdmin,
  requireShopOwner,
  requireExpert,
  requireCustomer,
  auditLog,
  apiLimiter,
  authLimiter,
  dataRequestLimiter
};
