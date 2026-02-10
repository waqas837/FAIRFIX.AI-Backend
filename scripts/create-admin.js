/**
 * Script to create an admin user
 * Usage: node scripts/create-admin.js
 */

require('dotenv').config();
const { prisma } = require('../src/config/database');
const { hashPassword } = require('../src/utils/auth');

async function createAdmin() {
  try {
    const email = process.argv[2] || 'admin@fairfix.ai';
    const password = process.argv[3] || 'Admin123!';
    const firstName = process.argv[4] || 'Admin';

    console.log('Creating admin user...');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Update existing user to admin
      const passwordHash = await hashPassword(password);
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'admin',
          passwordHash
        }
      });
      console.log('✅ Existing user updated to admin:', updatedUser.email);
    } else {
      // Create new admin user
      const passwordHash = await hashPassword(password);
      const adminUser = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName: 'User',
          role: 'admin'
        }
      });
      console.log('✅ Admin user created:', adminUser.email);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdmin();
