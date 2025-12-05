import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.tests
dotenv.config({ path: path.resolve(__dirname, '.env.tests') });

// API-only Playwright config, using request context (no browser)
export default defineConfig({
  testDir: './tests/api',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Limit workers to 2 to avoid Supabase auth rate limiting
  workers: 2,
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
