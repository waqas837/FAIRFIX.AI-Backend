const { prisma } = require('../config/database');

/**
 * Audit logging middleware
 * Logs sensitive actions for compliance and security
 * @param {string} action - Action name (e.g., 'login', 'data_export', 'data_delete')
 * @param {string} resourceType - Resource type (e.g., 'user', 'vehicle', 'case')
 */
function auditLog(action, resourceType = null) {
  return async (req, res, next) => {
    // Don't block the request if audit logging fails
    try {
      const userId = req.user?.id || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;
      const userAgent = req.get('user-agent') || null;
      
      // Extract resource ID from params or body
      const resourceId = req.params?.id || req.body?.id || null;
      
      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          ipAddress,
          userAgent,
          metadata: {
            method: req.method,
            path: req.path,
            query: req.query,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      // Log error but don't fail the request
      console.error('Audit logging error:', error);
    }
    
    next();
  };
}

module.exports = { auditLog };
