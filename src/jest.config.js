module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Look for files ending with .test.ts
    testMatch: ['**/src/**/*.test.ts'],
    // Module resolution for global fetch setup in tests
    setupFiles: ['<rootDir>/jest.setup.js'],
    // Mapping for module resolution, especially important for node-fetch mocking
    moduleNameMapper: {
      "^(\\.\\.?/.*)\\.js$": "$1",
      "node-fetch": "node-fetch"
    }
  };
  
