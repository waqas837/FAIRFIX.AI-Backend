/**
 * Express application - middleware and route mounting.
 * Entry point for the server is server.js.
 */

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const routes = require('./src/routes');
const { errorHandler } = require('./src/middleware');
const { scheduleRetentionPurge } = require('./src/jobs/retention');

const app = express();

// CORS: allow frontend (e.g. Next.js on port 3001)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser with error handling
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handler for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid JSON in request body' }
    });
  }
  next(err);
});

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'FAIRFIX.AI API Documentation'
}));

// API versioning - mount routes under /api/v1
app.use('/api/v1', routes);
// Backward compatibility - also mount under /api
app.use('/api', routes);

// Schedule retention purge job
if (process.env.NODE_ENV !== 'test') {
  scheduleRetentionPurge();
}

app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Not Found' } });
});

app.use(errorHandler);

module.exports = app;
