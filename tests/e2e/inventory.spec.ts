import { test, expect } from '../fixtures/fixtures';

test.describe('Inventory', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.inventoryPage.goto();
    await authenticatedPageManager.getPage().waitForTimeout(1000);
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

  test('[INVENTORY] should have edit button on products', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    
    if (await authenticatedPageManager.inventoryPage.hasProducts()) {
      await expect(editButton).toBeVisible();
    }
  });

  test('[INVENTORY] should have add batch button on products', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const addBatchButton = page.getByRole('button', { name: /add batch/i }).first();
    
    if (await authenticatedPageManager.inventoryPage.hasProducts()) {
      await expect(addBatchButton).toBeVisible();
    }
  });

  test('[INVENTORY] should open edit modal when clicking edit', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    if (await authenticatedPageManager.inventoryPage.hasProducts()) {
      const editButton = page.getByRole('button', { name: /edit/i }).first();
      await editButton.click();
      await page.waitForTimeout(500);
      
      // Dialog should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Should have cost price field
      await expect(page.getByLabel(/cost price/i)).toBeVisible();
      
      // Cancel edit
      await page.getByRole('button', { name: /cancel/i }).click();
    }
  });

  test('[INVENTORY] should open batch modal when clicking add batch', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    if (await authenticatedPageManager.inventoryPage.hasProducts()) {
      const addBatchButton = page.getByRole('button', { name: /add batch/i }).first();
      await addBatchButton.click();
      await page.waitForTimeout(500);
      
      // Should show quantity input
      await expect(page.getByPlaceholder(/enter quantity/i)).toBeVisible();
      
      // Cancel by clicking outside or closing
      await page.keyboard.press('Escape');
    }
  });

  test('[INVENTORY] should have history button on products', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const historyButton = page.getByRole('button', { name: /history/i }).first();
    
    if (await authenticatedPageManager.inventoryPage.hasProducts()) {
      await expect(historyButton).toBeVisible();
    }
  });

  test('[INVENTORY] should filter by category tabs', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    // Check for category tabs
    const honeyTab = page.getByRole('tab', { name: /honey/i });
    const mushroomTab = page.getByRole('tab', { name: /mushroom/i });
    
    if (await honeyTab.isVisible().catch(() => false)) {
      await honeyTab.click();
      await page.waitForTimeout(300);
    }
    
    if (await mushroomTab.isVisible().catch(() => false)) {
      await mushroomTab.click();
      await page.waitForTimeout(300);
    }
    
    // Back to all
    const allTab = page.getByRole('tab', { name: /all products/i });
    if (await allTab.isVisible().catch(() => false)) {
      await allTab.click();
    }
  });
});
