/**
 * Jest Test Setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

// Mock console to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging
    error: console.error
};

// Increase timeout for integration tests
jest.setTimeout(10000);
