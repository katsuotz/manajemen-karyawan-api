const express = require('express');
const { param } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { single } = require('../middleware/upload');
const { uploadAndImportCSV, getImportStatus } = require('../controllers/importController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// POST /api/import/employees - Upload and import CSV file ( admin only )
router.post('/employees', [
    requireRole(['admin']),
    single
], uploadAndImportCSV);

// GET /api/import/status/:jobId - Get import progress
router.get('/status/:jobId', [
    param('jobId').isUUID().withMessage('Invalid job ID format')
], getImportStatus);

module.exports = router;
