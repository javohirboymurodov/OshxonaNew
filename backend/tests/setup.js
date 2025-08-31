// Jest Test Setup
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/oshxona_test';

// Import test helpers
const testHelpers = require('./helpers/testHelpers');

// Make test helpers globally available
global.testHelpers = testHelpers;
global.createTestBranch = testHelpers.createTestBranch;
global.createTestUser = testHelpers.createTestUser;
global.createTestAdmin = testHelpers.createTestAdmin;
global.createTestSuperAdmin = testHelpers.createTestSuperAdmin;
global.createTestCategory = testHelpers.createTestCategory;
global.createTestProduct = testHelpers.createTestProduct;
global.createTestOrder = testHelpers.createTestOrder;
global.mockAuthToken = testHelpers.mockAuthToken;
global.mockExpiredToken = testHelpers.mockExpiredToken;
global.createMockTelegramCtx = testHelpers.createMockTelegramCtx;

// Mock external services during tests
jest.mock('../services/deliveryService', () => ({
  calculateDeliveryFee: jest.fn().mockResolvedValue(5000),
  resolveBranchForLocation: jest.fn().mockResolvedValue({
    branch: { _id: 'test-branch-id', name: 'Test Branch' },
    canDeliver: true,
    distance: 2.5
  })
}));

jest.mock('../services/geoService', () => ({
  getAddressFromCoordinates: jest.fn().mockResolvedValue('Test Address'),
  validateCoordinates: jest.fn().mockReturnValue(true)
}));

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    _id: '507f1f77bcf86cd799439011',
    telegramId: 123456789,
    firstName: 'Test',
    lastName: 'User',
    phone: '+998901234567',
    role: 'user',
    isActive: true
  },
  
  // Mock admin data
  mockAdmin: {
    _id: '507f1f77bcf86cd799439012',
    telegramId: 987654321,
    firstName: 'Test',
    lastName: 'Admin',
    phone: '+998907654321',
    role: 'admin',
    isActive: true
  },
  
  // Mock product data
  mockProduct: {
    _id: '507f1f77bcf86cd799439013',
    name: 'Test Pizza',
    description: 'Test pizza description',
    price: 45000,
    category: '507f1f77bcf86cd799439014',
    isActive: true,
    isVisible: true
  },
  
  // Mock category data
  mockCategory: {
    _id: '507f1f77bcf86cd799439014',
    name: 'Test Category',
    description: 'Test category description',
    isActive: true,
    isVisible: true
  },
  
  // Mock order data
  mockOrder: {
    _id: '507f1f77bcf86cd799439015',
    orderId: 'ORD-TEST-001',
    user: '507f1f77bcf86cd799439011',
    items: [{
      product: '507f1f77bcf86cd799439013',
      quantity: 2,
      price: 45000
    }],
    total: 90000,
    status: 'new',
    orderType: 'delivery',
    paymentMethod: 'cash'
  },
  
  // JWT token for tests
  testToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
  
  // Helper to create mock Telegraf context
  createMockCtx: (overrides = {}) => ({
    from: { id: 123456789, first_name: 'Test', last_name: 'User' },
    session: {},
    callbackQuery: null,
    message: null,
    updateType: 'message',
    reply: jest.fn().mockResolvedValue({}),
    replyWithPhoto: jest.fn().mockResolvedValue({}),
    editMessageText: jest.fn().mockResolvedValue({}),
    answerCbQuery: jest.fn().mockResolvedValue({}),
    replyWithLocation: jest.fn().mockResolvedValue({}),
    ...overrides
  }),
  
  // Helper to wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
};

// Console suppression during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(async () => {
  // Setup test database
  await testHelpers.setupTestDatabase();
  
  // Suppress console output during tests unless VERBOSE=true
  if (!process.env.VERBOSE) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(async () => {
  // Cleanup test database
  await testHelpers.cleanupTestDatabase();
  
  // Restore console output
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up after each test
afterEach(async () => {
  jest.clearAllMocks();
  // Clear test data but keep connection
  await testHelpers.clearTestData();
});
