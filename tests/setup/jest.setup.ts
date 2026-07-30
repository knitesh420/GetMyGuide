import dotenv from 'dotenv';
// Import mocks to ensure they're loaded
import './mocks';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE = '1h';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test';

// Set global basedir for tests
(global as any).__basedir = __dirname + '/../../';

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests (optional - comment out if you want to see logs)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
