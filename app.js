/**
 * Express application - middleware and route mounting.
 * Entry point for the server is server.js.
 */

const express = require('express');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Not Found' } });
});

app.use(errorHandler);

module.exports = app;
