export default {
  rootDir: '..',
  preset: '<rootDir>/test/jest.config.ts',
  roots: ['<rootDir>/src/core'],
  transform: {
    '^.+\\.js$': '@swc/jest',
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  collectCoverageFrom: ['src/core/**/*.ts']
};
