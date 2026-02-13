/**
 * HTTP server entry point - starts the Express app.
 * Fails to start if JWT_SECRET or JWT_REFRESH_SECRET are missing (no default secrets).
 */

require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
if (!jwtSecret || typeof jwtSecret !== 'string' || jwtSecret.trim() === '') {
  console.error('FATAL: JWT_SECRET must be set in environment. Set it in .env and restart.');
  process.exit(1);
}
if (!jwtRefreshSecret || typeof jwtRefreshSecret !== 'string' || jwtRefreshSecret.trim() === '') {
  console.error('FATAL: JWT_REFRESH_SECRET must be set in environment. Set it in .env and restart.');
  process.exit(1);
}

const app = require('./app');
const { env } = require('./src/config');

const port = env.port;

const server = app.listen(port, () => {
  console.log(`Server running in ${env.nodeEnv} on http://localhost:${port}`);
});

module.exports = server;
