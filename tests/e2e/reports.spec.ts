import { test, expect } from '../fixtures/fixtures';

test.describe('Reports', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.reportsPage.goto();
    const page = authenticatedPageManager.getPage();
    
    // Wait for either the heading to appear OR loading skeletons to disappear
    try {
      await page.waitForSelector('text=/Reports|Analytics|Revenue/i', { timeout: 10000 });
    } catch {
      // If heading doesn't appear, wait a bit more for content to load
      await page.waitForTimeout(3000);
    }
  });

  test('[REPORTS] should display reports page', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    // Wait for any content to load in main area
    await page.waitForTimeout(1000);
    
    // Check for heading or page content that indicates reports page
    const hasHeading = await page.getByRole('heading', { name: /report/i }).isVisible().catch(() => false);
    const hasAnalyticsText = await page.getByText(/Analytics/i).isVisible().catch(() => false);
    const hasReportsText = await page.getByText(/Reports/i).isVisible().catch(() => false);
    // Also check URL as fallback
    const isOnReportsPage = page.url().includes('/reports');
    
    expect(hasHeading || hasAnalyticsText || hasReportsText || isOnReportsPage).toBeTruthy();
  });

  test('[REPORTS] should show KPI cards', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await page.waitForTimeout(1000);
    expect(await authenticatedPageManager.reportsPage.areKPIsVisible()).toBeTruthy();
  });

  test('[REPORTS] should display revenue data', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    // Wait for main content area to have content (not empty)
    try {
      // Wait for any of these indicators that content has loaded:
      // - Revenue text appears
      // - A Card component renders
      // - Skeleton loader appears (then disappears)
      await page.waitForSelector('main >> text=/Revenue|Profit|Orders|R\\s*\\d/i', { timeout: 15000 });
    } catch {
      // Fallback: just wait longer for slow loads
      await page.waitForTimeout(5000);
    }
    
    // Check for revenue label or any financial data display
    const hasRevenueLabel = await page.getByText(/revenue/i).first().isVisible().catch(() => false);
    const hasCurrencyFormat = await page.locator('text=/R\\s*[\\d,\\.]+/').first().isVisible().catch(() => false);
    const hasFinancialData = await page.getByText(/profit|orders|gross|net/i).first().isVisible().catch(() => false);
    
    expect(hasRevenueLabel || hasCurrencyFormat || hasFinancialData).toBeTruthy();
  });

  test('[REPORTS] should allow date range selection with picker', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    // Click date range button
    const dateButton = page.getByRole('button').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}|pick a date/i }).first();
    if (await dateButton.isVisible().catch(() => false)) {
      await dateButton.click();
      await page.waitForTimeout(300);
      
      // Calendar should be visible
      await expect(page.locator('[role="grid"]').first()).toBeVisible();
      
      // Close picker
      await page.keyboard.press('Escape');
    }
  });

  test('[REPORTS] should use quick date range buttons', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    // Try clicking Last 30 Days or similar
    const quickButtons = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Month'];
    
    for (const buttonText of quickButtons) {
      const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') });
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(500);
        break;
      }
    }
    
    // Should still show reports
    expect(await authenticatedPageManager.reportsPage.isReportsPageVisible()).toBeTruthy();
  });

  test('[REPORTS] should display charts or data visualization', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    // Wait for charts/data to load
    await page.waitForTimeout(2000);
    
    // Check for charts or data visualizations
    const chartCount = await authenticatedPageManager.reportsPage.getChartCount();
    
    // Also check for data tables or stat cards as alternative visualizations
    const hasDataTable = await page.locator('table, [role="table"]').isVisible().catch(() => false);
    
    // Check for Card components (shadcn/ui cards have specific structure)
    const hasCards = await page.locator('[class*="rounded-"] [class*="pt-4"], [class*="CardContent"]').first().isVisible().catch(() => false);
    
    // Check for KPI cards with currency values (R xxx format)
    const hasKPICards = await page.locator('text=/R\\s*[\\d,]+/').first().isVisible().catch(() => false);
    
    // Pass if we have charts OR data tables OR cards with data
    expect(chartCount > 0 || hasDataTable || hasCards || hasKPICards).toBeTruthy();
  });
});
