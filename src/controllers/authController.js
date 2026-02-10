const { prisma } = require('../config/database');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { hashPassword, comparePassword, validatePassword } = require('../utils/auth');

/**
 * User registration
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { email, password, firstName, lastName, phone, role = 'customer' } = req.body;

    // Validate input
    if (!email || !password || !firstName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email, password, and first name are required' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid email format' }
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid password', details: passwordValidation.errors }
      });
    }

    // Validate role - prevent admin creation via registration
    const validRoles = ['customer', 'shop_owner', 'expert'];
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Admin role cannot be assigned during registration. Contact system administrator.' }
      });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid role. Must be one of: ' + validRoles.join(', ') }
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'User with this email already exists' }
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

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

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        ...tokens
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * User login
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
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
        phone: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
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
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        ...tokens
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token is required' }
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database and is not revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired refresh token' }
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() }
    });

    // Generate new tokens
    const tokens = generateTokenPair(user.id);

    // Save new refresh token to database
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
      message: 'Token refreshed successfully',
      data: tokens
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired refresh token' }
      });
    }

    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    // User should be attached by authenticate middleware
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    // Fetch full user profile
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        profilePhoto: true,
        dateOfBirth: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Update user profile
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    const { firstName, lastName, phone, address, city, state, zipCode } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Change password
 * PUT /api/auth/password
 */
async function changePassword(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current password and new password are required' }
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid new password', details: passwordValidation.errors }
      });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, passwordHash: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Current password is incorrect' }
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  updateProfile,
  changePassword
};
