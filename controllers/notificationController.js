const { Notification } = require('../models');
const { success, error } = require('../utils/responseHelper');
const { addConnection, getConnectionCount, getTotalConnections } = require('../services/sseService');

const notificationController = {
    // Get all notifications
    getNotifications: async (req, res) => {
        try {
            const { page = 1, limit = 20, unreadOnly = false } = req.query;
            
            const whereClause = {};
            
            if (unreadOnly === 'true') {
                whereClause.read = false;
            }
            
            const offset = (parseInt(page) - 1) * parseInt(limit);
            
            const { count, rows: notifications } = await Notification.findAndCountAll({
                where: whereClause,
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset,
            });
            
            return success(res, {
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / parseInt(limit))
                },
                unreadCount: await Notification.count({
                    where: { read: false }
                })
            });
        } catch (err) {
            console.error('Get notifications error:', err);
            return error(res, 'Failed to fetch notifications', 500);
        }
    },
    
    // Mark all notifications as read for user
    markAllAsRead: async (req, res) => {
        try {
            await Notification.update(
                { read: true },
                { where: { read: false } }
            );
            
            return success(res, {
                message: 'All notifications marked as read'
            });
        } catch (err) {
            console.error('Mark all as read error:', err);
            return error(res, 'Failed to mark all notifications as read', 500);
        }
    },
    
    // Create notification (internal use)
    createNotification: async (data) => {
        try {
            const notification = await Notification.create({
                title: data.title,
                message: data.message,
                type: data.type || 'system',
                jobId: data.jobId,
                metadata: data.metadata
            });
            
            return notification;
        } catch (err) {
            console.error('Create notification error:', err);
            throw err;
        }
    },
    
    // SSE subscription (existing functionality)
    subscribe: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Set SSE headers
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });
            
            // Add connection to SSE service
            addConnection(userId, res);
            
            console.log(`SSE connection established for user ${userId}`);
            
        } catch (err) {
            console.error('SSE subscription error:', err);
            return error(res);
        }
    },
    
    // Get connection status
    getConnectionStatus: async (req, res) => {
        try {
            const userId = req.user.id;
            const userConnections = getConnectionCount(userId);
            const totalConnections = getTotalConnections();
            
            return success(res, {
                userId,
                activeConnections: userConnections,
                totalActiveConnections: totalConnections,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Get connection status error:', err);
            return error(res);
        }
    }
};

module.exports = notificationController;
