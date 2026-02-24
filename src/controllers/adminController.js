const { prisma } = require('../config/database');

/**
 * Get audit logs (Admin only)
 * GET /api/admin/audit-logs
 */
async function getAuditLogs(req, res) {
  try {
    const { userId, action, resourceType, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    const auditLogs = await prisma.auditLog.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    const total = await prisma.auditLog.count({ where });

    res.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get all users (Admin only)
 * GET /api/admin/users
 */
async function getUsers(req, res) {
  try {
    const { role, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get user by ID (Admin only)
 * GET /api/admin/users/:id
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get all disputes (Admin only)
 * GET /api/admin/disputes
 */
async function getDisputes(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status;

    const disputes = await prisma.dispute.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        case: {
          select: {
            id: true,
            caseNumber: true
          }
        }
      }
    });

    const total = await prisma.dispute.count({ where });

    res.json({
      success: true,
      data: {
        disputes,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get dispute by ID (Admin only)
 * GET /api/admin/disputes/:id
 */
async function getDisputeById(req, res) {
  try {
    const { id } = req.params;

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        case: {
          select: {
            id: true,
            caseNumber: true
          }
        },
        events: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: { message: 'Dispute not found' }
      });
    }

    res.json({
      success: true,
      data: { dispute }
    });
  } catch (error) {
    console.error('Get dispute by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get all support tickets (Admin only)
 * GET /api/admin/support-tickets
 */
async function getSupportTickets(req, res) {
  try {
    const { status, priority, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tickets = await prisma.supportTicket.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    const total = await prisma.supportTicket.count({ where });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get support ticket by ID (Admin only)
 * GET /api/admin/support-tickets/:id
 */
async function getSupportTicketById(req, res) {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: { message: 'Support ticket not found' }
      });
    }

    res.json({
      success: true,
      data: { ticket }
    });
  } catch (error) {
    console.error('Get support ticket by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get system statistics (Admin only)
 * GET /api/admin/stats
 */
async function getStats(req, res) {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalShopOwners,
      totalExperts,
      totalVehicles,
      totalCases,
      totalDisputes,
      totalSupportTickets,
      activeSubscriptions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'customer' } }),
      prisma.user.count({ where: { role: 'shop_owner' } }),
      prisma.user.count({ where: { role: 'expert' } }),
      prisma.vehicle.count(),
      prisma.case.count(),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } })
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          shopOwners: totalShopOwners,
          experts: totalExperts
        },
        vehicles: totalVehicles,
        cases: totalCases,
        disputes: {
          open: totalDisputes
        },
        supportTickets: {
          open: totalSupportTickets
        },
        subscriptions: {
          active: activeSubscriptions
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get ledger entries (Admin only)
 * GET /api/admin/ledger
 */
async function getLedger(req, res) {
  try {
    const { type, status, userId, expertId, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (expertId) where.expertId = expertId;

    const ledgerEntries = await prisma.ledger.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.ledger.count({ where });

    res.json({
      success: true,
      data: {
        ledgerEntries,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get expert payouts (Admin only)
 * GET /api/admin/expert-payouts
 */
async function getExpertPayouts(req, res) {
  try {
    const { expertId, status, limit = 100, offset = 0 } = req.query;

    const where = { type: 'expert_payout' };
    if (expertId) where.expertId = expertId;
    if (status) where.status = status;

    const payouts = await prisma.ledger.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.ledger.count({ where });

    res.json({
      success: true,
      data: {
        payouts,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Get expert payouts error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Process refund (Admin only)
 * POST /api/admin/refunds
 */
async function processRefund(req, res) {
  try {
    const { paymentIntentId, amountCents, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Payment intent ID is required' }
      });
    }

    const { processRefund: refundHelper } = require('../utils/stripeHelpers');
    const refund = await refundHelper(paymentIntentId, amountCents, reason);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'refund_processed',
        resourceType: 'payment',
        resourceId: paymentIntentId,
        metadata: {
          refundId: refund.id,
          amountCents,
          reason
        }
      }
    });

    res.json({
      success: true,
      data: { refund }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Force close expert call (Admin only)
 * POST /api/admin/expert-calls/:id/force-close
 */
async function forceCloseCall(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { message: 'Reason is required' }
      });
    }

    const { forceCloseCall: forceClose } = require('../utils/callStateMachine');
    await forceClose(id, req.user.id, reason);

    res.json({
      success: true,
      message: 'Call force closed successfully'
    });
  } catch (error) {
    console.error('Force close call error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

/**
 * Get call states (Admin only)
 * GET /api/admin/call-states
 */
async function getCallStates(req, res) {
  try {
    const { state, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (state) where.state = state;

    const callStates = await prisma.callState.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { transitionedAt: 'desc' },
      include: {
        expertCall: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            },
            expert: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    const total = await prisma.callState.count({ where });

    res.json({
      success: true,
      data: {
        callStates,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Get call states error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error', details: error.message }
    });
  }
}

module.exports = {
  getAuditLogs,
  getUsers,
  getUserById,
  getDisputes,
  getDisputeById,
  getSupportTickets,
  getSupportTicketById,
  getStats,
  getLedger,
  getExpertPayouts,
  processRefund,
  forceCloseCall,
  getCallStates
};
