/**
 * Authentication middleware for M1.
 * - x-user-id: current user id (for read APIs until real auth).
 * - x-api-key: fallback as user id when REQUIRE_AUTH=true.
 * Sets req.user = { id } for protected routes.
 */

function authenticate(req, res, next) {
  const userId = req.headers['x-user-id'];
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (userId) {
    req.user = { id: userId };
    return next();
  }

  if (apiKey) {
    req.user = { id: apiKey };
    return next();
  }

  if (process.env.REQUIRE_AUTH === 'true') {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  req.user = { id: null };
  next();
}

/** Require a non-null user (for /users/me, /vehicles, etc.). */
function requireUser(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }
  next();
}

module.exports = { authenticate, requireUser };
