/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces role-based permissions for different user types
 */

/**
 * Middleware to require specific role(s)
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { 
          message: 'Insufficient permissions',
          details: `Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
        }
      });
    }

    next();
  };
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Middleware to require shop owner role
 */
function requireShopOwner(req, res, next) {
  return requireRole('shop_owner')(req, res, next);
}

/**
 * Middleware to require expert role
 */
function requireExpert(req, res, next) {
  return requireRole('expert')(req, res, next);
}

/**
 * Middleware to require customer role
 */
function requireCustomer(req, res, next) {
  return requireRole('customer')(req, res, next);
}

/**
 * Middleware to allow customer or admin
 */
function requireCustomerOrAdmin(req, res, next) {
  return requireRole('customer', 'admin')(req, res, next);
}

/**
 * Middleware to allow shop owner or admin
 */
function requireShopOwnerOrAdmin(req, res, next) {
  return requireRole('shop_owner', 'admin')(req, res, next);
}

/**
 * Middleware to allow expert or admin
 */
function requireExpertOrAdmin(req, res, next) {
  return requireRole('expert', 'admin')(req, res, next);
}

module.exports = {
  requireRole,
  requireAdmin,
  requireShopOwner,
  requireExpert,
  requireCustomer,
  requireCustomerOrAdmin,
  requireShopOwnerOrAdmin,
  requireExpertOrAdmin
};
