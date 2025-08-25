// tests/setup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Test database setup
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Close database connection after tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Global test utilities
global.createTestUser = async (userData = {}) => {
  const User = require('../models/User');
  const defaultUser = {
    firstName: 'Test',
    lastName: 'User',
    telegramId: Math.floor(Math.random() * 1000000),
    phone: '+998901234567',
    role: 'user',
    ...userData
  };
  
  return await User.create(defaultUser);
};

global.createTestBranch = async (branchData = {}) => {
  const Branch = require('../models/Branch');
  const defaultBranch = {
    name: 'Test Branch',
    address: 'Test Address',
    phone: '+998901234567',
    isActive: true,
    ...branchData
  };
  
  return await Branch.create(defaultBranch);
};

global.createTestProduct = async (productData = {}) => {
  const Product = require('../models/Product');
  const Category = require('../models/Category');
  
  // Create default category if needed
  let category = await Category.findOne();
  if (!category) {
    category = await Category.create({
      name: 'Test Category',
      isActive: true
    });
  }
  
  const defaultProduct = {
    name: 'Test Product',
    price: 10000,
    categoryId: category._id,
    isActive: true,
    ...productData
  };
  
  return await Product.create(defaultProduct);
};

// Mock JWT for tests
global.mockAuthToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId: user._id, 
      role: user.role,
      branchId: user.branch 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Console output control for tests
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}