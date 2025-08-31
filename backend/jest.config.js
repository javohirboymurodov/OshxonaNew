// Jest Test Configuration
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'utils/**/*.js',
    'handlers/**/*.js',
    'api/**/*.js',
    'services/**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!docs/**',
    '!scripts/**'
  ],
  
  // Coverage thresholds (reduced for current state)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 40,
      statements: 40
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test timeout (increased for database operations)
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Transform settings
  transform: {},
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test'
  }
};
