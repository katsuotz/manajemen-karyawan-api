const express = require('express');
const { body, query } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const employeeController = require('../controllers/employeeController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/employees - Get all employees (authenticated users)
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('sort').optional().matches(/^[a-zA-Z_]+:(asc|desc)$/).withMessage('Sort must be in format "field:direction" (e.g., "name:asc")')
], employeeController.getAllEmployees);

// GET /api/employees/:id - Get employee by ID (authenticated users)
router.get('/:id', employeeController.getEmployeeById);

// POST /api/employees - Create employee (admin only)
router.post('/', [
    requireRole(['admin']),
    body('name').notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name maximum length is 100 characters'),
    body('age').notEmpty().withMessage('Age is required').isInt().withMessage('Age must be a number'),
    body('position').notEmpty().withMessage('Position is required').isLength({ max: 50 }).withMessage('Position maximum length is 50 characters'),
    body('salary').notEmpty().withMessage('Salary is required').isFloat({ min: 0 }).withMessage('Salary must be a positive number')
], employeeController.createEmployee);

// PUT /api/employees/:id - Update employee (admin only)
router.put('/:id', [
    requireRole(['admin']),
    body('name').optional().isLength({ max: 100 }).withMessage('Name maximum length is 100 characters'),
    body('age').optional().isInt().withMessage('Age must be a number'),
    body('position').optional().isLength({ max: 50 }).withMessage('Position maximum length is 50 characters'),
    body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number')
], employeeController.updateEmployee);

// DELETE /api/employees/:id - Delete employee (admin only)
router.delete('/:id', [
    requireRole(['admin'])
], employeeController.deleteEmployee);

module.exports = router;
