const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Rate limiter for data export/delete endpoints
 * Limits: 3 requests per hour per user
 * Note: These endpoints require authentication, so req.user.id is always available
 */
const dataRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit to 3 requests per hour
  keyGenerator: (req) => {
    // These endpoints require auth, so user.id is always present
    return `user:${req.user?.id || 'unknown'}`;
  },
  message: {
    success: false,
    error: {
      message: 'Too many data requests, please try again later.'
    }
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  dataRequestLimiter
};
