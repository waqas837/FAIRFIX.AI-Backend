const { verifyToken } = require('../utils/jwt');
const { prisma } = require('../config/database');

/**
 * JWT Authentication middleware
 * Extracts and verifies JWT token from Authorization header
 * Sets req.user with user data for protected routes
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Authorization token required' } 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = verifyToken(token);
      
      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true
        }
      });

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: { message: 'User not found' } 
        });
      }

      req.user = user;
      req.userId = user.id;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          error: { message: 'Invalid token' } 
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: { message: 'Token expired' } 
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Authentication failed' } 
    });
  }
}

/** Require a non-null authenticated user */
function requireUser(req, res, next) {
  if (!req.user || !req.userId) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Authentication required' } 
    });
  }
  next();
}

module.exports = { authenticate, requireUser };
