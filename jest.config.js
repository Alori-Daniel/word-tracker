module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  watchman: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
};
