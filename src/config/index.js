/**
 * Central config exports (env, db).
 */

require('dotenv').config();

const { prisma } = require('./database');

module.exports = {
  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
  },
  prisma,
};
