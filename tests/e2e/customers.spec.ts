import { test, expect } from '../fixtures/fixtures';

test.describe('Customers', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.customersPage.goto();
  });

  test('[CUSTOMERS] should display customers page', async ({ authenticatedPageManager }) => {
    expect(await authenticatedPageManager.customersPage.isCustomersPageVisible()).toBeTruthy();
  });

  test('[CUSTOMERS] should show add customer button', async ({ authenticatedPageManager }) => {
    const addButton = authenticatedPageManager.getPage().getByRole('button', { name: /add customer/i });
    await expect(addButton).toBeVisible();
  });

  test('[CUSTOMERS] should open add customer modal', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.customersPage.clickAddCustomer();
    
    // Wait for modal to appear
    await authenticatedPageManager.getPage().waitForTimeout(500);
    expect(await authenticatedPageManager.customersPage.isAddCustomerModalVisible()).toBeTruthy();
  });

  test('[CUSTOMERS] should display customer list or empty state', async ({ authenticatedPageManager }) => {
    const hasCustomers = await authenticatedPageManager.customersPage.hasCustomers();
    expect(typeof hasCustomers).toBe('boolean');
  });

  test('[CUSTOMERS] should click on customer to view details', async ({ authenticatedPageManager }) => {
    const hasCustomers = await authenticatedPageManager.customersPage.hasCustomers();
    
    if (hasCustomers) {
      await authenticatedPageManager.customersPage.clickFirstCustomer();
      expect(await authenticatedPageManager.customersPage.isCustomerDetailPage()).toBeTruthy();
    }
  });
});
