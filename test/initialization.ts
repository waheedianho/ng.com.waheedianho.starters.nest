import { execSync } from 'child_process';
import { randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';

jest.setTimeout(60000);

const testJwtSecret = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
process.env.MONGO_DATABASE ||= 'nestjs_test';
process.env.POSTGRES_DATABASE ||= 'nestjs_test';
process.env.JWT_SECRET_KEY = testJwtSecret;
process.env.TOKEN_TEST = jwt.sign(
  { email: 'admin@admin.com', name: 'Admin', id: 'df032f19-fc4c-4409-9aa9-33264d2c7b71' },
  testJwtSecret,
  { expiresIn: '5m' }
);

jest.mock('pino-http', () => ({
  HttpLogger: {},
  pinoHttp: () => ({
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn()
    }
  })
}));

jest.mock('pino', () => jest.createMockFromModule('pino'));

try {
  execSync('docker info', { stdio: 'ignore' });
} catch {
  console.error(`
    Error: Docker is not running or accessible.

    Container tests require Docker to be active.
    Please start Docker and run the tests again.
  `);
  process.exit(1);
}
