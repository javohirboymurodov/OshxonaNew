/**
 * Test Helper Functions
 * Barcha testlar uchun umumiy helper functions
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Import models
const { User, Branch, Product, Category, Order } = require('../../models');

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Test Database Setup with MongoDB Memory Server
 */
async function setupTestDatabase() {
  try {
    // Use MongoDB Memory Server for isolated testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to in-memory database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB Memory Server');
    }
  } catch (error) {
    console.error('❌ Test database setup error:', error);
    // Fallback to local MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/oshxona_test');
    }
  }
}

async function cleanupTestDatabase() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('❌ Test database cleanup error:', error);
  }
}

/**
 * Test Data Creators
 */
async function createTestBranch(overrides = {}) {
  const branchData = {
    name: 'Test Branch',
    title: 'Test Branch Title',
    address: {
      street: 'Test Street 123',
      city: 'Tashkent',
      district: 'Test District',
      fullAddress: 'Test Street 123, Test District, Tashkent'
    },
    phone: '+998901234567',
    location: {
      latitude: 41.2995,
      longitude: 69.2401
    },
    isActive: true,
    workingHours: {
      open: '09:00',
      close: '23:00'
    },
    ...overrides
  };

  return await Branch.create(branchData);
}

async function createTestUser(overrides = {}) {
  const userData = {
    firstName: 'Test',
    lastName: 'User',
    telegramId: Math.floor(Math.random() * 1000000),
    phone: '+998901234567',
    role: 'user',
    isActive: true,
    ...overrides
  };

  return await User.create(userData);
}

async function createTestAdmin(overrides = {}) {
  const branch = await createTestBranch();
  
  const adminData = {
    firstName: 'Test',
    lastName: 'Admin',
    telegramId: Math.floor(Math.random() * 1000000),
    phone: '+998907654321',
    email: 'test@admin.uz',
    role: 'admin',
    password: 'admin123', // Plain password - model will hash it
    branch: branch._id,
    isActive: true,
    ...overrides
  };

  const admin = await User.create(adminData);
  return { admin, branch };
}

async function createTestSuperAdmin(overrides = {}) {
  const superAdminData = {
    firstName: 'Test',
    lastName: 'SuperAdmin',
    telegramId: Math.floor(Math.random() * 1000000),
    phone: '+998909876543',
    email: 'super@admin.uz',
    role: 'superadmin',
    password: 'super123', // Plain password - model will hash it
    isActive: true,
    ...overrides
  };

  return await User.create(superAdminData);
}

async function createTestCategory(overrides = {}) {
  const categoryData = {
    name: 'Test Category',
    description: 'Test category description',
    isActive: true,
    isVisible: true,
    order: 1,
    ...overrides
  };

  return await Category.create(categoryData);
}

async function createTestProduct(overrides = {}) {
  const category = await createTestCategory();
  const branch = await createTestBranch();
  
  const productData = {
    name: 'Test Product',
    description: 'Test product description',
    price: 25000,
    categoryId: category._id,
    branch: branch._id,
    isActive: true,
    isAvailable: true,
    images: ['test-image.jpg'],
    ...overrides
  };

  return await Product.create(productData);
}

async function createTestOrder(overrides = {}) {
  const user = await createTestUser();
  const product = await createTestProduct();
  const branch = await createTestBranch();
  
  const orderData = {
    orderId: `TEST-${Date.now()}`,
    user: user._id,
    branch: branch._id,
    items: [{
      product: product._id,
      quantity: 2,
      price: product.price,
      total: product.price * 2
    }],
    totalAmount: product.price * 2,
    status: 'pending',
    orderType: 'delivery',
    paymentMethod: 'cash',
    customerInfo: {
      name: user.firstName + ' ' + user.lastName,
      phone: user.phone
    },
    ...overrides
  };

  return await Order.create(orderData);
}

/**
 * JWT Token Helpers
 */
function mockAuthToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      id: user._id,
      role: user.role,
      email: user.email,
      branch: user.branch || null
    },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
}

function mockExpiredToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '-1h' } // Already expired
  );
}

/**
 * Telegraf Context Helpers
 */
function createMockTelegramCtx(overrides = {}) {
  return {
    from: { 
      id: 123456789, 
      first_name: 'Test', 
      last_name: 'User',
      username: 'testuser'
    },
    chat: { id: 123456789, type: 'private' },
    session: {
      step: 'idle',
      cart: [],
      orderData: {},
      waitingFor: null
    },
    callbackQuery: null,
    message: null,
    updateType: 'message',
    reply: jest.fn().mockResolvedValue({ message_id: 1 }),
    replyWithPhoto: jest.fn().mockResolvedValue({ message_id: 1 }),
    editMessageText: jest.fn().mockResolvedValue({ message_id: 1 }),
    editMessageReplyMarkup: jest.fn().mockResolvedValue({ message_id: 1 }),
    answerCbQuery: jest.fn().mockResolvedValue(true),
    replyWithLocation: jest.fn().mockResolvedValue({ message_id: 1 }),
    replyWithDocument: jest.fn().mockResolvedValue({ message_id: 1 }),
    deleteMessage: jest.fn().mockResolvedValue(true),
    telegram: {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
      editMessageText: jest.fn().mockResolvedValue({ message_id: 1 })
    },
    ...overrides
  };
}

/**
 * Database Cleanup
 */
async function clearTestData() {
  const collections = ['users', 'branches', 'products', 'categories', 'orders'];
  
  for (const collection of collections) {
    try {
      await mongoose.connection.collection(collection).deleteMany({});
    } catch (error) {
      console.warn(`Warning: Could not clear ${collection}:`, error.message);
    }
  }
}

/**
 * Wait Helper
 */
const waitFor = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  // Database
  setupTestDatabase,
  cleanupTestDatabase,
  clearTestData,
  
  // Data creators
  createTestBranch,
  createTestUser,
  createTestAdmin,
  createTestSuperAdmin,
  createTestCategory,
  createTestProduct,
  createTestOrder,
  
  // JWT helpers
  mockAuthToken,
  mockExpiredToken,
  
  // Telegram helpers
  createMockTelegramCtx,
  
  // Utilities
  waitFor
};