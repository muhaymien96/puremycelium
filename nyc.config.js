module.exports = {
  extends: '@istanbuljs/nyc-config-typescript',
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
  reporter: ['html', 'text', 'lcov'],
  all: true
};