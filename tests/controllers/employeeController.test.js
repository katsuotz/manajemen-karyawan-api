// Mock dependencies before requiring the controller
jest.mock('../../services/employeeQueue', () => ({
  addEmployeeCreationJob: jest.fn()
}));

jest.mock('../../models', () => require('../utils/mocks').mockModels);
jest.mock('../../utils/responseHelper', () => require('../utils/mocks').mockResponseHelper);
jest.mock('express-validator', () => ({
  validationResult: () => require('../utils/mocks').mockValidationResult
}));
jest.mock('uuid', () => ({
  validate: jest.fn(() => true)
}));

const employeeController = require('../../controllers/employeeController');
const { 
  mockModels, 
  mockResponseHelper,
  createMockRequest, 
  createMockResponse,
  mockValidationResult 
} = require('../utils/mocks');
const { addEmployeeCreationJob } = require('../../services/employeeQueue');

describe('EmployeeController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('getAllEmployees', () => {
    it('should return paginated employees successfully', async () => {
      // Arrange
      req.query = { page: '1', limit: '10' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.Employee.findAndCountAll.mockResolvedValue({
        count: 25,
        rows: [mockModels.Employee]
      });
      mockResponseHelper.success.mockReturnValue(res);

      // Act
      await employeeController.getAllEmployees(req, res);

      // Assert
      expect(mockModels.Employee.findAndCountAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        order: [['created_at', 'DESC']]
      });
      expect(mockResponseHelper.success).toHaveBeenCalledWith(res, {
        employees: [mockModels.Employee],
        pagination: {
          currentPage: 1,
          totalPages: 3,
          totalItems: 25,
          itemsPerPage: 10
        }
      });
    });

    it('should use default pagination when no query params provided', async () => {
      // Arrange
      req.query = {};
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.Employee.findAndCountAll.mockResolvedValue({
        count: 5,
        rows: [mockModels.Employee]
      });
      mockResponseHelper.success.mockReturnValue(res);

      // Act
      await employeeController.getAllEmployees(req, res);

      // Assert
      expect(mockModels.Employee.findAndCountAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        order: [['created_at', 'DESC']]
      });
    });

    it('should return validation error for invalid query params', async () => {
      // Arrange
      req.query = { page: 'invalid' };
      mockValidationResult.isEmpty.mockReturnValue(false);
      mockValidationResult.array.mockReturnValue([{ msg: 'Invalid page' }]);
      mockResponseHelper.validationError.mockReturnValue(res);

      // Act
      await employeeController.getAllEmployees(req, res);

      // Assert
      expect(mockResponseHelper.validationError).toHaveBeenCalledWith(res, [{ msg: 'Invalid page' }]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      req.query = {};
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.Employee.findAndCountAll.mockRejectedValue(new Error('Database error'));
      mockResponseHelper.error.mockReturnValue(res);

      // Act
      await employeeController.getAllEmployees(req, res);

      // Assert
      expect(mockResponseHelper.error).toHaveBeenCalledWith(res);
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee when found', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      mockModels.Employee.findByPk.mockResolvedValue(mockModels.Employee);
      mockResponseHelper.success.mockReturnValue(res);

      // Act
      await employeeController.getEmployeeById(req, res);

      // Assert
      expect(mockModels.Employee.findByPk).toHaveBeenCalledWith('valid-uuid');
      expect(mockResponseHelper.success).toHaveBeenCalledWith(res, { employee: mockModels.Employee });
    });

    it('should return not found for invalid UUID', async () => {
      // Arrange
      req.params = { id: 'invalid-uuid' };
      const { validate } = require('uuid');
      validate.mockReturnValue(false);
      mockResponseHelper.notFound.mockReturnValue(res);

      // Act
      await employeeController.getEmployeeById(req, res);

      // Assert
      expect(mockResponseHelper.notFound).toHaveBeenCalledWith(res, 'Employee not found');
    });

    it('should return not found when employee does not exist', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      mockModels.Employee.findByPk.mockResolvedValue(null);
      mockResponseHelper.notFound.mockReturnValue(res);

      // Act
      await employeeController.getEmployeeById(req, res);

      // Assert
      expect(mockResponseHelper.notFound).toHaveBeenCalledWith(res, 'Employee not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      const { validate } = require('uuid');
      validate.mockReturnValue(true); // Ensure UUID validation passes
      mockModels.Employee.findByPk.mockRejectedValue(new Error('Database error'));
      mockResponseHelper.error.mockReturnValue(res);

      // Act
      await employeeController.getEmployeeById(req, res);

      // Assert
      expect(mockResponseHelper.error).toHaveBeenCalledWith(res);
    });
  });

  describe('createEmployee', () => {
    it('should queue employee creation and return job ID', async () => {
      // Arrange
      req.body = { name: 'John Doe', age: 30, position: 'Software Engineer', salary: 12000000 };
      req.user = { id: 'test-user-id' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      addEmployeeCreationJob.mockResolvedValue('job-uuid');
      mockResponseHelper.success.mockReturnValue(res);

      // Act
      await employeeController.createEmployee(req, res);

      // Assert
      expect(addEmployeeCreationJob).toHaveBeenCalledWith(req.body, 'test-user-id');
      expect(mockResponseHelper.success).toHaveBeenCalledWith(res, {
        jobId: 'job-uuid',
        message: 'Employee creation queued for background processing',
        status: 'processing'
      }, 202, 'Employee creation request accepted');
    });

    it('should return validation error for invalid input', async () => {
      // Arrange
      req.body = { name: '', age: 'invalid' };
      mockValidationResult.isEmpty.mockReturnValue(false);
      mockValidationResult.array.mockReturnValue([{ msg: 'Invalid input' }]);
      mockResponseHelper.validationError.mockReturnValue(res);

      // Act
      await employeeController.createEmployee(req, res);

      // Assert
      expect(mockResponseHelper.validationError).toHaveBeenCalledWith(res, [{ msg: 'Invalid input' }]);
    });

    it('should handle queue errors gracefully', async () => {
      // Arrange
      req.body = { name: 'John Doe', age: 30, position: 'Software Engineer', salary: 12000000 };
      req.user = { id: 'test-user-id' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      addEmployeeCreationJob.mockRejectedValue(new Error('Queue error'));
      mockResponseHelper.error.mockReturnValue(res);

      // Act
      await employeeController.createEmployee(req, res);

      // Assert
      expect(mockResponseHelper.error).toHaveBeenCalledWith(res);
    });
  });

  describe('updateEmployee', () => {
    it('should update employee successfully', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      req.body = { name: 'Updated Name' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.Employee.findByPk.mockResolvedValue(mockModels.Employee);
      mockModels.Employee.update.mockResolvedValue();
      mockModels.Employee.findByPk.mockResolvedValue(mockModels.Employee);
      mockResponseHelper.success.mockReturnValue(res);

      // Act
      await employeeController.updateEmployee(req, res);

      // Assert
      expect(mockModels.Employee.findByPk).toHaveBeenCalledWith('valid-uuid');
      expect(mockModels.Employee.update).toHaveBeenCalledWith(req.body);
      expect(mockResponseHelper.success).toHaveBeenCalledWith(res, { employee: mockModels.Employee }, 200, 'Employee updated successfully');
    });

    it('should return not found when employee does not exist', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      req.body = { name: 'Updated Name' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.Employee.findByPk.mockResolvedValue(null);
      mockResponseHelper.notFound.mockReturnValue(res);

      // Act
      await employeeController.updateEmployee(req, res);

      // Assert
      expect(mockResponseHelper.notFound).toHaveBeenCalledWith(res, 'Employee not found');
    });

    it('should return validation error for invalid input', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      req.body = { name: '' };
      mockValidationResult.isEmpty.mockReturnValue(false);
      mockValidationResult.array.mockReturnValue([{ msg: 'Invalid name' }]);
      mockResponseHelper.validationError.mockReturnValue(res);

      // Act
      await employeeController.updateEmployee(req, res);

      // Assert
      expect(mockResponseHelper.validationError).toHaveBeenCalledWith(res, [{ msg: 'Invalid name' }]);
    });
  });

  describe('deleteEmployee', () => {
    it('should delete employee successfully', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      mockModels.Employee.findByPk.mockResolvedValue(mockModels.Employee);
      mockModels.Employee.destroy.mockResolvedValue();
      mockResponseHelper.success.mockReturnValue(res);

      // Act
      await employeeController.deleteEmployee(req, res);

      // Assert
      expect(mockModels.Employee.findByPk).toHaveBeenCalledWith('valid-uuid');
      expect(mockModels.Employee.destroy).toHaveBeenCalled();
      expect(mockResponseHelper.success).toHaveBeenCalledWith(res, null, 200, 'Employee deleted successfully');
    });

    it('should return not found when employee does not exist', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      mockModels.Employee.findByPk.mockResolvedValue(null);
      mockResponseHelper.notFound.mockReturnValue(res);

      // Act
      await employeeController.deleteEmployee(req, res);

      // Assert
      expect(mockResponseHelper.notFound).toHaveBeenCalledWith(res, 'Employee not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      req.params = { id: 'valid-uuid' };
      mockModels.Employee.findByPk.mockRejectedValue(new Error('Database error'));
      mockResponseHelper.error.mockReturnValue(res);

      // Act
      await employeeController.deleteEmployee(req, res);

      // Assert
      expect(mockResponseHelper.error).toHaveBeenCalledWith(res);
    });
  });
});
