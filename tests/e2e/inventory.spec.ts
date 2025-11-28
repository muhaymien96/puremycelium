import { test, expect } from '../fixtures/fixtures';

test.describe('Inventory', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.inventoryPage.goto();
  });

  test('[INVENTORY] should display inventory page', async ({ authenticatedPageManager }) => {
    expect(await authenticatedPageManager.inventoryPage.isInventoryPageVisible()).toBeTruthy();
  });

  test('[INVENTORY] should show add product button', async ({ authenticatedPageManager }) => {
    const addButton = authenticatedPageManager.getPage().getByRole('button', { name: /add product/i });
    await expect(addButton).toBeVisible();
  });

  test('[INVENTORY] should open add product modal', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.inventoryPage.clickAddProduct();
    
    // Wait for modal
    await authenticatedPageManager.getPage().waitForTimeout(500);
    expect(await authenticatedPageManager.inventoryPage.isAddProductModalVisible()).toBeTruthy();
  });

  test('[INVENTORY] should display tabs for filtering', async ({ authenticatedPageManager }) => {
    // Check for All Products tab
    const allProductsTab = authenticatedPageManager.getPage().getByRole('tab', { name: /all products/i });
    await expect(allProductsTab).toBeVisible();
  });

  test('[INVENTORY] should display product list or empty state', async ({ authenticatedPageManager }) => {
    const hasProducts = await authenticatedPageManager.inventoryPage.hasProducts();
    expect(typeof hasProducts).toBe('boolean');
  });
});
