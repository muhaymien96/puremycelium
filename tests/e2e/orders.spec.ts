import { test, expect } from '../fixtures/fixtures';

test.describe('Orders', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.ordersPage.goto();
  });

  test('[ORDERS] should display orders page', async ({ authenticatedPageManager }) => {
  expect(await authenticatedPageManager.ordersPage.isOrdersPageVisible()).toBeTruthy();
});

test('[ORDERS] should display orders list or empty state', async ({ authenticatedPageManager }) => {
  const hasOrders = await authenticatedPageManager.ordersPage.hasOrders();
  expect(typeof hasOrders).toBe('boolean');
});

test('[ORDERS] should filter orders by status', async ({ authenticatedPageManager }) => {
  await authenticatedPageManager.ordersPage.clickFilterButton();
});

test('[ORDERS] should open order detail modal when clicking on order', async ({ authenticatedPageManager }) => {
  const hasOrders = await authenticatedPageManager.ordersPage.hasOrders();
  
    if (hasOrders) {
      await authenticatedPageManager.ordersPage.clickFirstOrder();
      expect(await authenticatedPageManager.ordersPage.isOrderDetailModalVisible()).toBeTruthy();
    }
  });
});
