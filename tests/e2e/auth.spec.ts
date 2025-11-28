import { test, expect } from '../fixtures/fixtures';

test.describe('Authentication', () => {
  test.beforeEach(async ({ pageManager, context }) => {
    // Clear all cookies and storage to ensure clean auth state
    await context.clearCookies();
    await context.clearPermissions();
    await pageManager.authPage.goto();
  });

  test('[AUTH] should display auth page', async ({ pageManager }) => {
    const title = await pageManager.authPage.getTitle();
    expect(title).toContain('PureMycelium');
    
    // Verify heading is visible
    const heading = await pageManager.authPage.getHeadingText();
    expect(heading).toContain('PureMycelium');
    
    // Verify Sign In tab is active by default
    const isSignIn = await pageManager.authPage.isSignInPage();
    expect(isSignIn).toBeTruthy();
  });

  test('[AUTH] should show validation errors for invalid inputs', async ({ pageManager }) => {
    // Fill invalid email to trigger Zod validation
    await pageManager.getPage().locator('#signin-email').fill('invalid-email');
    await pageManager.getPage().locator('#signin-password').fill('123');
    
    const currentUrl = pageManager.getPage().url();
    
    // Click sign in button
    await pageManager.getPage().getByRole('button', { name: /^Sign In$/i }).last().click();
    
    // Wait a moment for any navigation attempt
    await pageManager.getPage().waitForTimeout(1000);
    
    // Verify we stayed on the auth page (no redirect)
    expect(pageManager.getPage().url()).toBe(currentUrl);
  });

  test('[AUTH] should toggle between sign in and sign up', async ({ pageManager }) => {
    expect(await pageManager.authPage.isSignInPage()).toBeTruthy();
    
    await pageManager.authPage.switchToSignUp();
    expect(await pageManager.authPage.isSignUpPage()).toBeTruthy();
    expect(await pageManager.authPage.isFullNameFieldVisible()).toBeTruthy();
    
    await pageManager.authPage.switchToSignIn();
    expect(await pageManager.authPage.isSignInPage()).toBeTruthy();
  });

  test('[AUTH] should redirect to dashboard after successful login', async ({ pageManager }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'muhaymien96@gmail.com';
    const testPassword = process.env.TEST_USER_PASSWORD || '123456';

    await pageManager.authPage.signIn(testEmail, testPassword);
    await pageManager.authPage.waitForRedirectToDashboard();
    
    // Verify we're on dashboard
    await expect(pageManager.getPage()).toHaveURL(/.*\/dashboard/);
  });

  test('[AUTH] should show error for invalid credentials', async ({ pageManager }) => {
    await pageManager.authPage.signIn('invalid@example.com', 'wrongpassword');
    
    // Wait for toast error message
    await expect(pageManager.getPage().getByText(/invalid email or password/i)).toBeVisible({ timeout: 5000 });
  });
});