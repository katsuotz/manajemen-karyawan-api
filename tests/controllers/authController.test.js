// Mock dependencies before requiring the controller
jest.mock('../../models', () => require('../utils/mocks').mockModels);
jest.mock('../../utils/jwt', () => require('../utils/mocks').mockJWT);
jest.mock('../../utils/responseHelper', () => require('../utils/mocks').mockResponseHelper);
jest.mock('express-validator', () => ({
  validationResult: () => require('../utils/mocks').mockValidationResult
}));

const authController = require('../../controllers/authController');
const { 
  mockModels, 
  mockJWT, 
  mockResponseHelper,
  createMockRequest, 
  createMockResponse,
  mockValidationResult 
} = require('../utils/mocks');

describe('AuthController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('login', () => {
    it('should return success response with token for valid credentials', async () => {
      // Arrange
      req.body = { email: 'test@example.com', password: 'password123' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.User.findOne.mockResolvedValue(mockModels.User);
      mockModels.User.comparePassword.mockResolvedValue(true);
      mockJWT.generateToken.mockReturnValue('mock-jwt-token');
      mockResponseHelper.success.mockReturnValue(res);

      // Act
      await authController.login(req, res);

      // Assert
      expect(mockValidationResult.isEmpty).toHaveBeenCalled();
      expect(mockModels.User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockModels.User.comparePassword).toHaveBeenCalledWith('password123');
      expect(mockJWT.generateToken).toHaveBeenCalledWith({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin'
      });
      expect(mockResponseHelper.success).toHaveBeenCalledWith(res, {
        token: 'mock-jwt-token',
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        }
      }, 200);
    });

    it('should return validation error for invalid input', async () => {
      // Arrange
      req.body = { email: 'invalid-email', password: '' };
      mockValidationResult.isEmpty.mockReturnValue(false);
      mockValidationResult.array.mockReturnValue([{ msg: 'Invalid email' }]);
      mockResponseHelper.validationError.mockReturnValue(res);

      // Act
      await authController.login(req, res);

      // Assert
      expect(mockResponseHelper.validationError).toHaveBeenCalledWith(res, [{ msg: 'Invalid email' }]);
    });

    it('should return unauthorized error for non-existent user', async () => {
      // Arrange
      req.body = { email: 'nonexistent@example.com', password: 'password123' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.User.findOne.mockResolvedValue(null);
      mockResponseHelper.unauthorized.mockReturnValue(res);

      // Act
      await authController.login(req, res);

      // Assert
      expect(mockModels.User.findOne).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
      expect(mockResponseHelper.unauthorized).toHaveBeenCalledWith(res, 'Invalid email or password');
    });

    it('should return unauthorized error for invalid password', async () => {
      // Arrange
      req.body = { email: 'test@example.com', password: 'wrongpassword' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.User.findOne.mockResolvedValue(mockModels.User);
      mockModels.User.comparePassword.mockResolvedValue(false);
      mockResponseHelper.unauthorized.mockReturnValue(res);

      // Act
      await authController.login(req, res);

      // Assert
      expect(mockModels.User.comparePassword).toHaveBeenCalledWith('wrongpassword');
      expect(mockResponseHelper.unauthorized).toHaveBeenCalledWith(res, 'Invalid email or password');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      req.body = { email: 'test@example.com', password: 'password123' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.User.findOne.mockRejectedValue(new Error('Database connection failed'));
      mockResponseHelper.error.mockReturnValue(res);

      // Act
      await authController.login(req, res);

      // Assert
      expect(mockResponseHelper.error).toHaveBeenCalledWith(res);
    });

    it('should handle password comparison errors gracefully', async () => {
      // Arrange
      req.body = { email: 'test@example.com', password: 'password123' };
      mockValidationResult.isEmpty.mockReturnValue(true);
      mockModels.User.findOne.mockResolvedValue(mockModels.User);
      mockModels.User.comparePassword.mockRejectedValue(new Error('Password comparison failed'));
      mockResponseHelper.error.mockReturnValue(res);

      // Act
      await authController.login(req, res);

      // Assert
      expect(mockResponseHelper.error).toHaveBeenCalledWith(res);
    });
  });
});
