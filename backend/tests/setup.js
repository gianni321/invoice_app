// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_that_is_at_least_32_characters_long';
process.env.DB_PATH = ':memory:'; // Use in-memory database for tests

// Suppress console.log during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};