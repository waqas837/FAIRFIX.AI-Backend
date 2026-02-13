const { prisma } = require('../config/database');
const { buildUserExport, anonymizeUser } = require('../services/dataExportService');

/**
 * Create data request (export or delete) and fulfill it immediately.
 * - Export: builds structured user data, stores it on the request, returns request + export in response.
 * - Delete: anonymizes user PII and revokes refresh tokens, then marks request completed.
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

    const dataRequest = await prisma.dataRequest.create({
      data: {
        userId,
        type,
        status: 'processing'
      }
    });

    if (type === 'export') {
      try {
        const exportData = await buildUserExport(userId);
        if (!exportData) {
          await prisma.dataRequest.update({
            where: { id: dataRequest.id },
            data: { status: 'failed', errorMessage: 'User not found' }
          });
          return res.status(404).json({
            success: false,
            error: { message: 'User not found' }
          });
        }
        const updated = await prisma.dataRequest.update({
          where: { id: dataRequest.id },
          data: {
            status: 'completed',
            fulfilledAt: new Date(),
            exportData
          }
        });
        return res.status(201).json({
          success: true,
          message: 'Export completed successfully',
          data: {
            request: updated,
            export: exportData
          }
        });
      } catch (err) {
        console.error('Export error:', err);
        await prisma.dataRequest.update({
          where: { id: dataRequest.id },
          data: { status: 'failed', errorMessage: err.message || 'Export failed' }
        });
        return res.status(500).json({
          success: false,
          error: { message: 'Export failed', details: err.message }
        });
      }
    }

    if (type === 'delete') {
      try {
        await anonymizeUser(userId);
        const updated = await prisma.dataRequest.update({
          where: { id: dataRequest.id },
          data: {
            status: 'completed',
            fulfilledAt: new Date()
          }
        });
        return res.status(201).json({
          success: true,
          message: 'Account data has been anonymized. You are now logged out.',
          data: { request: updated }
        });
      } catch (err) {
        console.error('Deletion/anonymization error:', err);
        await prisma.dataRequest.update({
          where: { id: dataRequest.id },
          data: { status: 'failed', errorMessage: err.message || 'Deletion failed' }
        });
        return res.status(500).json({
          success: false,
          error: { message: 'Deletion failed', details: err.message }
        });
      }
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
 * Get data request status (and export data when type=export and status=completed).
 */
async function getDataRequest(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const dataRequest = await prisma.dataRequest.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!dataRequest) {
      return res.status(404).json({
        success: false,
        error: { message: 'Data request not found' }
      });
    }

    const response = {
      success: true,
      data: {
        request: {
          id: dataRequest.id,
          type: dataRequest.type,
          status: dataRequest.status,
          fulfilledAt: dataRequest.fulfilledAt,
          exportUrl: dataRequest.exportUrl,
          errorMessage: dataRequest.errorMessage,
          createdAt: dataRequest.createdAt,
          updatedAt: dataRequest.updatedAt
        }
      }
    };

    if (dataRequest.type === 'export' && dataRequest.status === 'completed' && dataRequest.exportData) {
      response.data.export = dataRequest.exportData;
    }

    res.json(response);
  } catch (error) {
    console.error('Get data request error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * List data requests for current user.
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
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        fulfilledAt: true,
        exportUrl: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true
      }
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
