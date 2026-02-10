/**
 * Database configuration - Prisma client singleton.
 * Prevents multiple instances in development (e.g. hot reload).
 */

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

let prisma;

try {
  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error);
  throw error;
}

// Verify Prisma client is available
if (!prisma) {
  throw new Error('Prisma Client is not initialized. Run: npm run db:generate');
}

module.exports = { prisma };
