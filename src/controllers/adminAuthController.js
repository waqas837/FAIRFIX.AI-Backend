const { prisma } = require('../config/database');
const { generateTokenPair } = require('../utils/jwt');
const { comparePassword } = require('../utils/auth');

/**
 * Admin login (separate endpoint)
 * POST /api/admin/login
 */
async function adminLogin(req, res) {
  try {
    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: { message: 'Request body is required' }
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required' }
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    // Generate tokens
    const tokens = generateTokenPair(user.id);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: userWithoutPassword,
        ...tokens
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

module.exports = {
  adminLogin
};
