module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // look for tests under src/tests, src/__tests__, or any file matching *.test.ts
  testMatch: ['**/src/tests/**/*.test.[jt]s?(x)', '**/src/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)']
};
