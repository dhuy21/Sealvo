/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.integration.test.js'],
  collectCoverageFrom: ['app/**/*.js', '!app/views/**', '!app/config/**'],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000,
};
