const { mock } = require('jest');

// Mock Sequelize models
const mockUser = {
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
  comparePassword: jest.fn(),
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedpassword',
  role: 'admin'
};

const mockEmployee = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  findAndCountAll: jest.fn(),
  bulkCreate: jest.fn(),
  id: 'test-employee-id',
  name: 'John Doe',
  age: 30,
  position: 'Software Engineer',
  salary: 12000000
};

// Mock models
const mockModels = {
  User: mockUser,
  Employee: mockEmployee
};

// Mock JWT utility
const mockJWT = {
  generateToken: jest.fn((payload) => 'mock-jwt-token'),
  verifyToken: jest.fn((token) => ({ id: 'test-user-id', email: 'test@example.com', role: 'admin' }))
};

// Mock response helper
const mockResponseHelper = {
  success: jest.fn(),
  created: jest.fn(),
  error: jest.fn(),
  notFound: jest.fn(),
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
  validationError: jest.fn()
};

// Mock Bull queue
const mockQueue = {
  add: jest.fn(),
  process: jest.fn(),
  client: {
    publish: jest.fn(),
    hset: jest.fn(),
    expire: jest.fn(),
    hgetall: jest.fn(),
    duplicate: jest.fn(() => ({
      connect: jest.fn(),
      subscribe: jest.fn(),
      quit: jest.fn()
    }))
  }
};

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  publish: jest.fn(),
  hset: jest.fn(),
  expire: jest.fn(),
  hgetall: jest.fn(),
  duplicate: jest.fn(() => mockQueue.client),
  quit: jest.fn()
};

// Mock Express request/response
const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: { id: 'test-user-id', email: 'test@example.com', role: 'admin' },
  file: null,
  ...overrides
});

const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    write: jest.fn(),
    writeHead: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  };
  return res;
};

// Mock express-validator
const mockValidationResult = {
  isEmpty: jest.fn(),
  array: jest.fn(() => [])
};

module.exports = {
  mockUser,
  mockEmployee,
  mockModels,
  mockJWT,
  mockResponseHelper,
  mockQueue,
  mockRedisClient,
  createMockRequest,
  createMockResponse,
  mockValidationResult
};
