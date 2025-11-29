import { defineConfig } from '@playwright/test';

// API-only Playwright config, using request context (no browser)
export default defineConfig({
  testDir: './tests/api',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_API_BASE_URL || process.env.K6_SUPABASE_URL,
    extraHTTPHeaders: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.K6_SERVICE_ROLE_KEY || '',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.K6_SERVICE_ROLE_KEY || ''}`,
      'Content-Type': 'application/json',
    },
  },
});
