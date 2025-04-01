/**
 * @fileoverview
 * Jest configuration for the GraphQL Query Optimizer library.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 68,
      functions: 80,
      lines: 75,
      statements: 75
    }
  }
}; 