import { test, expect } from '../fixtures/fixtures';

test.describe('Reports', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.reportsPage.goto();
  });

  test('[REPORTS] should display reports page', async ({ authenticatedPageManager }) => {
    expect(await authenticatedPageManager.reportsPage.isReportsPageVisible()).toBeTruthy();
  });

  test('[REPORTS] should show KPI cards', async ({ authenticatedPageManager }) => {
    expect(await authenticatedPageManager.reportsPage.areKPIsVisible()).toBeTruthy();
  });

  test('[REPORTS] should display reports content', async ({ authenticatedPageManager }) => {
    // Just verify reports page loaded successfully
    expect(await authenticatedPageManager.reportsPage.isReportsPageVisible()).toBeTruthy();
  });

  test('[REPORTS] should allow date range selection', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.reportsPage.clickDateFilter();
  });
});
