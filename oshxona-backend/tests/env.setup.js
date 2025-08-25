// tests/env.setup.js
// Set up environment variables for testing

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.MONGODB_URI = 'mongodb://localhost:27017/oshxona-test';
process.env.BOT_TOKEN = 'test-bot-token';
process.env.WEBHOOK_URL = 'http://localhost:5000/webhook';

// Disable console output during tests unless explicitly needed
const originalConsole = console;
if (process.env.SILENT_TESTS !== 'false') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = originalConsole.error; // Keep errors visible
}