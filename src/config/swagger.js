const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FAIRFIX.AI API',
      version: '1.0.0',
      description: 'Backend API for FAIRFIX.AI - Vehicle diagnostic and repair platform with compliance features (CCPA/PIPEDA/GDPR)',
      contact: {
        name: 'FAIRFIX.AI Support',
        email: 'support@fairfix.ai'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.fairfix.ai/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'shop_owner', 'expert', 'admin'] },
            phone: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Vehicle: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            vinHash: { type: 'string', description: 'Hashed VIN (compliance)' },
            plateNumber: { type: 'string' },
            make: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'integer' },
            mileage: { type: 'integer' }
          }
        },
        ConsentLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            purpose: { 
              type: 'string', 
              enum: ['diagnostic_data', 'call_recording', 'monica_monitoring', 'ai_summary', 'post_repair_verification'] 
            },
            version: { type: 'string' },
            consented: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        DataRequest: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            type: { type: 'string', enum: ['export', 'delete'] },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            fulfilledAt: { type: 'string', format: 'date-time' },
            exportUrl: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                details: { type: 'string' }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/swagger-routes.js',
    './src/routes/*.js',
    './src/routes/**/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
