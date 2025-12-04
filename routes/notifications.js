const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// SSE endpoint - handles authentication via query parameter (no middleware)
router.get('/subscribe', notificationController.subscribe);

// Apply authentication to all other routes
router.use(authenticateToken);

// GET /api/notifications - Get all notifications for authenticated user
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count - Get unread notifications count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/read-all - Mark all notifications as read (must come before :id routes)
router.patch('/read-all', notificationController.markAllAsRead);

// GET /api/notifications/status - Get connection status
router.get('/status', notificationController.getConnectionStatus);

module.exports = router;
