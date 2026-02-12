/**
 * Seed a test vendor for Case flow (Vendor availability confirm step).
 * Usage: node scripts/seed-vendors.js
 */
require('dotenv').config();
const { prisma } = require('../src/config/database');

async function seed() {
  const existing = await prisma.vendor.findFirst({ where: { name: 'Parts Supply Co' } });
  if (existing) {
    console.log('Vendor already exists:', existing.id);
  } else {
    const v = await prisma.vendor.create({ data: { name: 'Parts Supply Co' } });
    console.log('Vendor created:', v.id);
  }
  const count = await prisma.vendor.count();
  console.log('Total vendors:', count);
  await prisma.$disconnect();
  process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
