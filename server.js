/**
 * HTTP server entry point - starts the Express app.
 */

require('dotenv').config();

const app = require('./app');
const { env } = require('./src/config');

const port = env.port;

const server = app.listen(port, () => {
  console.log(`Server running in ${env.nodeEnv} on http://localhost:${port}`);
});

module.exports = server;
