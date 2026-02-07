const { prisma } = require('../config/database');

/**
 * GET /users/me — current user profile (customer/shop_owner/expert).
 */
async function getMe(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        emergencyContactName: true,
        emergencyContactPhone: true,
        preferences: true,
        notificationPreferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
