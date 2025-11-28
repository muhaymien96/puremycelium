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

    // In CI, wait a bit for the dev server to be fully ready
    if (process.env.CI) {
      console.log('⏳ CI detected, waiting for dev server to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Navigate to auth page with retry logic for CI stability
    console.log(`🌐 Navigating to ${baseURL}/auth...`);
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto(`${baseURL}/auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        break;
      } catch (navError) {
        retries--;
        if (retries === 0) throw navError;
        console.log(`⚠️ Navigation failed, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Wait for the page to fully load
    console.log('✅ Auth page loaded, waiting for React to hydrate...');
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    console.log('📍 Current URL:', page.url());
    
    // Wait for React app to mount with better error handling
    // First wait for body to have content (React mounted)
    await page.waitForFunction(
      () => document.body && document.body.innerHTML.length > 100,
      { timeout: 30000 }
    );
    console.log('✅ React app appears to be mounted');
    
    // Now wait for either h1 or the auth form to be visible
    try {
      await page.waitForSelector('h1, #signin-email, input[type="email"]', { state: 'visible', timeout: 30000 });
      console.log('✅ Page content visible');
    } catch (selectorError) {
      // Log page content for debugging
      const bodyHTML = await page.evaluate(() => document.body?.innerHTML?.substring(0, 500) || 'No body');
      console.log('📄 Page body preview:', bodyHTML);
      throw selectorError;
    }
    
    // Log current page state for debugging
    const h1Element = page.locator('h1').first();
    if (await h1Element.isVisible().catch(() => false)) {
      const pageTitle = await h1Element.textContent();
      console.log(`📄 Page title: ${pageTitle}`);
    } else {
      console.log('📄 No h1 found, continuing with auth form...');
    }
    
    // Wait for the Sign In tab content to be visible (default tab)
    // The auth page uses tabs with specific input IDs
    try {
      await page.waitForSelector('#signin-email', { state: 'visible', timeout: 15000 });
    } catch {
      // Fallback: try clicking the Sign In tab first
      console.log('⚠️ Sign In form not immediately visible, trying to click Sign In tab...');
      const signInTab = page.locator('[value="signin"]');
      if (await signInTab.isVisible()) {
        await signInTab.click();
        await page.waitForSelector('#signin-email', { state: 'visible', timeout: 15000 });
      } else {
        // Last fallback: use any visible email input
        console.log('⚠️ Falling back to generic email input selector...');
        await page.waitForSelector('input[type="email"]:visible', { timeout: 15000 });
      }
    }
    console.log('✅ Sign In form is visible');

    // Fill in credentials and sign in using specific IDs
    console.log('📝 Filling in credentials...');
    
    // Try specific IDs first, fallback to generic selectors
    const emailInput = page.locator('#signin-email').or(page.locator('input[type="email"]:visible').first());
    const passwordInput = page.locator('#signin-password').or(page.locator('input[type="password"]:visible').first());
    
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    
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
