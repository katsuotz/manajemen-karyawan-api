const { validationResult } = require('express-validator');
const { Employee } = require('../models');
const { success, created, error, notFound, validationError } = require('../utils/responseHelper');
const { validate: isUUID } = require('uuid');

const employeeController = {
    getAllEmployees: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return validationError(res, errors.array());
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { count, rows: employees } = await Employee.findAndCountAll({
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            return success(res, {
                employees,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: limit
                }
            });
        } catch (err) {
            console.error('Get all employees error:', err);
            return error(res);
        }
    },

    getEmployeeById: async (req, res) => {
        try {
            const id = req.params.id;
            if (!isUUID(id)) {
                return notFound(res, 'Employee not found');
            }

            const employee = await Employee.findByPk(id);

            if (!employee) {
                return notFound(res, 'Employee not found');
            }

            return success(res, { employee });
        } catch (err) {
            console.error('Get employee by ID error:', err);
            return error(res);
        }
    },

    createEmployee: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return validationError(res, errors.array());
            }

            const employee = await Employee.create(req.body);
            const createdEmployee = await Employee.findByPk(employee.id);

            return created(res, { employee: createdEmployee }, 'Employee created successfully');
        } catch (err) {
            console.error('Create employee error:', err);
            return error(res);
        }
    },

    updateEmployee: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return validationError(res, errors.array());
            }

            const employee = await Employee.findByPk(req.params.id);
            if (!employee) {
                return notFound(res, 'Employee not found');
            }

            await employee.update(req.body);
            const updatedEmployee = await Employee.findByPk(employee.id);

            return success(res, { employee: updatedEmployee }, 200, 'Employee updated successfully');
        } catch (err) {
            console.error('Update employee error:', err);
            return error(res);
        }
    },

    deleteEmployee: async (req, res) => {
        try {
            const employee = await Employee.findByPk(req.params.id);
            if (!employee) {
                return notFound(res, 'Employee not found');
            }

            await employee.destroy();

            return success(res, null, 200, 'Employee deleted successfully');
        } catch (err) {
            console.error('Delete employee error:', err);
            return error(res);
        }
    }
};

module.exports = employeeController;
