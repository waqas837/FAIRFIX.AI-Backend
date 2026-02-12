/**
 * Seed approved shops for testing Case flow (vehicle + shop selection).
 * Usage: node scripts/seed-shops.js
 */

require('dotenv').config();
const { prisma } = require('../src/config/database');

const SHOPS = [
  { name: 'Downtown Auto Care', address: '123 Main St', phone: '+1-555-0100', tier: 'Gold', status: 'approved' },
  { name: 'Quick Fix Garage', address: '456 Oak Ave', phone: '+1-555-0101', tier: 'Silver', status: 'approved' },
  { name: 'Pro Mechanic Hub', address: '789 Elm Rd', phone: '+1-555-0102', tier: 'Platinum', status: 'approved' },
];

async function seedShops() {
  try {
    for (const shop of SHOPS) {
      const existing = await prisma.shop.findFirst({
        where: { name: shop.name },
      });
      if (existing) {
        await prisma.shop.update({
          where: { id: existing.id },
          data: { status: 'approved' },
        });
        console.log('✅ Shop updated:', shop.name);
      } else {
        await prisma.shop.create({
          data: {
            name: shop.name,
            address: shop.address,
            phone: shop.phone,
            tier: shop.tier,
            status: 'approved',
          },
        });
        console.log('✅ Shop created:', shop.name);
      }
    }
    const count = await prisma.shop.count({ where: { status: 'approved' } });
    console.log(`\nDone. There are ${count} approved shop(s). Use Case flow → select vehicle + shop → Create case.`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedShops();
