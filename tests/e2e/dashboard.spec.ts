import { test, expect } from '../fixtures/fixtures';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.dashboardPage.goto();
  });

  test('[DASHBOARD] should display dashboard stats', async ({ authenticatedPageManager }) => {
  await expect(await authenticatedPageManager.dashboardPage.isDashboardVisible()).toBeTruthy();
  await expect(await authenticatedPageManager.dashboardPage.areStatsVisible()).toBeTruthy();
});

test('[DASHBOARD] should navigate to orders page', async ({ authenticatedPageManager }) => {
  await authenticatedPageManager.dashboardPage.navigateToOrders();
  
  const url = await authenticatedPageManager.dashboardPage.getCurrentUrl();
  expect(url).toContain('/orders');
});

test('[DASHBOARD] should navigate to inventory page', async ({ authenticatedPageManager }) => {
  await authenticatedPageManager.dashboardPage.navigateToInventory();
  
  const url = await authenticatedPageManager.dashboardPage.getCurrentUrl();
  expect(url).toContain('/inventory');
});

test('[DASHBOARD] should navigate to customers page', async ({ authenticatedPageManager }) => {
  await authenticatedPageManager.dashboardPage.navigateToCustomers();
  
  const url = await authenticatedPageManager.dashboardPage.getCurrentUrl();
  expect(url).toContain('/customers');
});

  test('[DASHBOARD] should navigate to reports page', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.dashboardPage.navigateToReports();
    
    const url = await authenticatedPageManager.dashboardPage.getCurrentUrl();
    expect(url).toContain('/reports');
  });
});
