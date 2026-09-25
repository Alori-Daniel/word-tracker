module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  watchman: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**'],
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
};
