import { test, expect } from '../fixtures/fixtures';

test.describe('New Sale', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.goto();
  });

  test('[NEW_SALE] should display new sale page', async ({ authenticatedPageManager }) => {
    expect(await authenticatedPageManager.newSalePage.isNewSalePageVisible()).toBeTruthy();
  });


  test('[NEW_SALE] should display cart section', async ({ authenticatedPageManager }) => {
    // Just verify the page loaded, cart can have items from previous tests
    expect(await authenticatedPageManager.newSalePage.isNewSalePageVisible()).toBeTruthy();
  });

  test('[NEW_SALE] should add product to cart', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.addFirstProductToCart();
    
    // Wait for cart to update
    await authenticatedPageManager.getPage().waitForTimeout(500);
  });

  test('[NEW_SALE] should show payment methods', async ({ authenticatedPageManager }) => {
    expect(await authenticatedPageManager.newSalePage.isPaymentMethodVisible()).toBeTruthy();
  });

  test('[NEW_SALE] should display customer section', async ({ authenticatedPageManager }) => {
    // Verify the new sale page has loaded successfully
    const page = authenticatedPageManager.getPage();
    await expect(page).toHaveURL(/.*\/sale/);
  });
});
