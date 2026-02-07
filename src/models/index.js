/**
 * Data access layer - re-exports Prisma client.
 * Schema is defined in prisma/schema.prisma; run `npm run db:generate` after schema changes.
 */

const { prisma } = require('../config/database');

module.exports = { prisma };
