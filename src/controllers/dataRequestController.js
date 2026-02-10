const { prisma } = require('../config/database');

/**
 * Create data request (export or delete)
 * POST /api/data-requests
 */
async function createDataRequest(req, res) {
  try {
    const { type } = req.body;
    const userId = req.userId;

    if (!type || !['export', 'delete'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'type must be either "export" or "delete"' }
      });
    }

    // Check for pending requests
    const pendingRequest = await prisma.dataRequest.findFirst({
      where: {
        userId,
        type,
        status: 'pending'
      }
    });

    if (pendingRequest) {
      return res.status(409).json({
        success: false,
        error: { 
          message: `A ${type} request is already pending`,
          data: { request: pendingRequest }
        }
      });
    }

    // Create data request
    const dataRequest = await prisma.dataRequest.create({
      data: {
        userId,
        type,
        status: 'pending'
      }
    });

    // For export requests, trigger async processing
    // For delete requests, trigger async deletion
    // This would typically be handled by a background job/queue
    // For now, we'll mark it as processing
    if (type === 'export') {
      // TODO: Trigger export job
      // This would generate a ZIP file with all user data
    } else if (type === 'delete') {
      // TODO: Trigger deletion job
      // This would anonymize or delete all user data
    }

    res.status(201).json({
      success: true,
      message: `${type} request created successfully`,
      data: { request: dataRequest }
    });
  } catch (error) {
    console.error('Create data request error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get data request status
 * GET /api/data-requests/:id
 */
async function getDataRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const dataRequest = await prisma.dataRequest.findFirst({
      where: {
        id,
        userId // Ensure user can only access their own requests
      }
    });

    if (!dataRequest) {
      return res.status(404).json({
        success: false,
        error: { message: 'Data request not found' }
      });
    }

    res.json({
      success: true,
      data: { request: dataRequest }
    });
  } catch (error) {
    console.error('Get data request error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * List data requests for current user
 * GET /api/data-requests
 */
async function listDataRequests(req, res) {
  try {
    const userId = req.userId;
    const { type, status } = req.query;

    const where = { userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const dataRequests = await prisma.dataRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { requests: dataRequests }
    });
  } catch (error) {
    console.error('List data requests error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

module.exports = {
  createDataRequest,
  getDataRequest,
  listDataRequests
};
