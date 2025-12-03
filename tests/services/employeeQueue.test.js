// Mock dependencies before requiring the service
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => require('../utils/mocks').mockQueue);
});

jest.mock('../../models', () => require('../utils/mocks').mockModels);

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

const { employeeQueue, addEmployeeCreationJob, processEmployeeCreation } = require('../../services/employeeQueue');
const { mockModels, mockQueue } = require('../utils/mocks');

describe('EmployeeQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addEmployeeCreationJob', () => {
    it('should add employee creation job to queue', async () => {
      // Arrange
      const employeeData = {
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 12000000
      };
      const userId = 'test-user-id';

      // Act
      const jobId = await addEmployeeCreationJob(employeeData, userId);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith('create-employee', {
        employeeData,
        jobId: 'test-uuid',
        userId
      }, {
        attempts: 3,
        backoff: 'exponential',
        removeOnComplete: 10,
        removeOnFail: 5
      });
      expect(jobId).toBe('test-uuid');
    });

    it('should handle queue add errors gracefully', async () => {
      // Arrange
      const employeeData = { name: 'John Doe', age: 30 };
      const userId = 'test-user-id';
      mockQueue.add.mockRejectedValue(new Error('Queue connection failed'));

      // Act & Assert
      await expect(addEmployeeCreationJob(employeeData, userId)).rejects.toThrow('Queue connection failed');
    });
  });

  describe('processEmployeeCreation', () => {
    let jobData;

    beforeEach(() => {
      jobData = {
        employeeData: {
          name: 'John Doe',
          age: 30,
          position: 'Software Engineer',
          salary: 12000000
        },
        jobId: 'test-job-id',
        userId: 'test-user-id'
      };
    });

    it('should process employee creation successfully', async () => {
      // Arrange
      const createdEmployee = {
        id: 'test-employee-id',
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 12000000,
        created_at: new Date().toISOString()
      };
      mockModels.Employee.create.mockResolvedValue(createdEmployee);
      
      // Act
      const result = await processEmployeeCreation(jobData);

      // Assert
      expect(mockModels.Employee.create).toHaveBeenCalledWith({
        id: 'test-uuid',
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 12000000
      }, { validate: true });
      
      // Get the actual call arguments
      const [channel, message] = mockQueue.client.publish.mock.calls[0];
      const parsedMessage = JSON.parse(message);
      
      expect(channel).toBe('employee-notifications');
      expect(parsedMessage).toMatchObject({
        type: 'employee_created',
        userId: 'test-user-id',
        jobId: 'test-job-id',
        status: 'success',
        data: {
          employee: {
            id: 'test-employee-id',
            name: 'John Doe',
            age: 30,
            position: 'Software Engineer',
            salary: 12000000,
            created_at: createdEmployee.created_at
          }
        }
      });
      expect(parsedMessage.timestamp).toBeDefined();
      expect(typeof parsedMessage.timestamp).toBe('string');

      expect(result).toEqual({ success: true, employee: createdEmployee });
    });

    it('should handle employee creation errors and publish error notification', async () => {
      // Arrange
      const error = new Error('Validation failed');
      mockModels.Employee.create.mockRejectedValue(error);

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Validation failed');

      // Get the actual call arguments
      const [channel, message] = mockQueue.client.publish.mock.calls[0];
      const parsedMessage = JSON.parse(message);
      
      expect(channel).toBe('employee-notifications');
      expect(parsedMessage).toMatchObject({
        type: 'employee_created',
        userId: 'test-user-id',
        jobId: 'test-job-id',
        status: 'error',
        error: 'Validation failed'
      });
      expect(parsedMessage.timestamp).toBeDefined();
      expect(typeof parsedMessage.timestamp).toBe('string');
    });

    it('should handle Redis publish errors gracefully', async () => {
      // Arrange
      const createdEmployee = {
        id: 'test-employee-id',
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 12000000
      };
      mockModels.Employee.create.mockResolvedValue(createdEmployee);
      mockQueue.client.publish.mockRejectedValue(new Error('Redis publish failed'));

      // Act & Assert
      // The function should still complete even if Redis publish fails
      await expect(processEmployeeCreation(jobData)).resolves.toEqual({ success: true, employee: createdEmployee });
    });

    it('should reject when employee data is missing', async () => {
      // Arrange
      jobData.employeeData = null;
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Employee data is required');
    });

    it('should reject when required fields are missing', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe'
        // Missing age, position, salary
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Missing required fields: age, position, salary');
    });

    it('should reject when name is empty or invalid', async () => {
      // Arrange
      jobData.employeeData = {
        name: '',
        age: 30,
        position: 'Software Engineer',
        salary: 12000000
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Name is required');
    });

    it('should reject when name is not a string', async () => {
      // Arrange
      jobData.employeeData = {
        name: 123,
        age: 30,
        position: 'Software Engineer',
        salary: 12000000
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Name is required');
    });

    it('should reject when age is below minimum', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe',
        age: 17,
        position: 'Software Engineer',
        salary: 12000000
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Age must be a number');
    });

    it('should reject when age is above maximum', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe',
        age: 101,
        position: 'Software Engineer',
        salary: 12000000
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Age must be a number');
    });

    it('should reject when age is not a number', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe',
        age: 'invalid',
        position: 'Software Engineer',
        salary: 12000000
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Age must be a number');
    });

    it('should reject when position is empty', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe',
        age: 30,
        position: '',
        salary: 12000000
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Position is required');
    });

    it('should reject when position is not a string', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe',
        age: 30,
        position: 123,
        salary: 12000000
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Position is required');
    });

    it('should reject when salary is zero or negative', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 0
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Salary must be a positive number');
    });

    it('should reject when salary is not a number', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 'invalid'
      };
      mockQueue.client.publish.mockResolvedValue();

      // Act & Assert
      await expect(processEmployeeCreation(jobData)).rejects.toThrow('Salary must be a positive number');
    });

    it('should accept valid employee data', async () => {
      // Arrange
      jobData.employeeData = {
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 12000000
      };
      
      const createdEmployee = {
        id: 'test-employee-id',
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 12000000,
        created_at: new Date().toISOString()
      };
      mockModels.Employee.create.mockResolvedValue(createdEmployee);
      mockQueue.client.publish.mockResolvedValue();

      // Act
      const result = await processEmployeeCreation(jobData);

      // Assert
      expect(mockModels.Employee.create).toHaveBeenCalledWith({
        id: 'test-uuid',
        name: 'John Doe',
        age: 30,
        position: 'Software Engineer',
        salary: 12000000
      }, { validate: true });
      expect(result).toEqual({ success: true, employee: createdEmployee });
    });
  });
});
