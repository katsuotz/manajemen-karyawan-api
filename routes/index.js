const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Auth routes
router.use('/auth', authRoutes);

module.exports = router;
