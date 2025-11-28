import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:8080';
  const storageStatePath = path.join(__dirname, '..', 'storage', 'auth.json');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔐 Running global authentication setup...');
    console.log(`📍 Base URL: ${baseURL}`);

    // Get test credentials from environment
    const testEmail = process.env.TEST_USER_EMAIL || 'muhaymien96@gmail.com';
    const testPassword = process.env.TEST_USER_PASSWORD || '123456';
    console.log(`👤 Using credentials: ${testEmail}`);

    // Navigate to auth page
    console.log(`🌐 Navigating to ${baseURL}/auth...`);
    await page.goto(`${baseURL}/auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('✅ Auth page loaded');

    // Fill in credentials and sign in
    console.log('📝 Filling in credentials...');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    console.log('🔘 Clicking sign in button...');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for successful authentication (redirect to dashboard)
    console.log('⏳ Waiting for redirect to dashboard...');
    await page.waitForURL(/.*\/dashboard/, { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    console.log('✅ Authentication successful, saving storage state...');

    // Save the authentication state
    await context.storageState({ path: storageStatePath });

    console.log(`✅ Storage state saved to: ${storageStatePath}`);
  } catch (error) {
    console.error('❌ Global authentication setup failed:', error);
    
    // Take screenshot for debugging
    try {
      const screenshotPath = path.join(__dirname, '..', 'storage', 'auth-failure.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`📸 Screenshot saved to: ${screenshotPath}`);
      console.error(`📍 Current URL: ${page.url()}`);
    } catch (screenshotError) {
      console.error('Failed to capture screenshot:', screenshotError);
    }
    
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
