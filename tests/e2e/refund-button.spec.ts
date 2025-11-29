import { test, expect } from '../fixtures/fixtures';

test.describe('Refund Button State', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.ordersPage.goto();
    await authenticatedPageManager.getPage().waitForTimeout(1000);
  });

  test('[REFUND] should be disabled when order has no completed payment', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    // Check if there are any orders
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Open first order
    await ordersPage.clickViewButtonByIndex(0);
    await page.waitForTimeout(1000);
    
    // Check if modal is visible
    const modalVisible = await ordersPage.isOrderDetailModalVisible();
    expect(modalVisible).toBeTruthy();

    // Check payment status
    const hasCompletedPayment = await ordersPage.hasCompletedPayment();
    
    if (!hasCompletedPayment) {
      // Refund button should NOT be visible
      const refundVisible = await ordersPage.isRefundButtonVisible();
      expect(refundVisible).toBeFalsy();
    } else {
      // If has completed payment, skip this specific test
      test.skip(true, 'First order has completed payment, cannot test this scenario');
    }
  });

  test('[REFUND] should be enabled when order has completed payment', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find an order with completed payment
    const orderCount = await ordersPage.getOrderCount();
    let foundCompletedPayment = false;

    for (let i = 0; i < Math.min(orderCount, 5); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.waitForTimeout(1500);
      
      const hasCompletedPayment = await ordersPage.hasCompletedPayment();
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isCancelled = orderStatus.toLowerCase().includes('cancelled');
      const isFullyRefunded = orderStatus.toLowerCase().includes('refunded') && !orderStatus.toLowerCase().includes('partially');
      
      if (hasCompletedPayment && !isCancelled && !isFullyRefunded) {
        foundCompletedPayment = true;
        
        // Refund button should be visible and enabled
        const refundVisible = await ordersPage.isRefundButtonVisible();
        expect(refundVisible).toBeTruthy();
        
        const refundEnabled = await ordersPage.isRefundButtonEnabled();
        expect(refundEnabled).toBeTruthy();
        
        break;
      }
      
      // Close modal and try next order
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(500);
    }

    if (!foundCompletedPayment) {
      test.skip(true, 'No orders with completed payment found');
    }
  });

  test('[REFUND] should NOT be visible when order is cancelled', async ({ authenticatedPageManager }) => {
    test.setTimeout(60000); // Increase timeout for this test
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a cancelled order
    const orderCount = await ordersPage.getOrderCount();
    let foundCancelledOrder = false;

    for (let i = 0; i < Math.min(orderCount, 10); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      
      // Wait for modal to be visible with longer timeout
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isCancelled = orderStatus.toLowerCase().includes('cancelled');
      
      if (isCancelled) {
        foundCancelledOrder = true;
        
        // Refund button should NOT be visible
        const refundVisible = await ordersPage.isRefundButtonVisible();
        expect(refundVisible).toBeFalsy();
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundCancelledOrder) {
      test.skip(true, 'No cancelled orders found');
    }
  });

  test('[REFUND] should NOT be visible when order is fully refunded', async ({ authenticatedPageManager }) => {
    test.setTimeout(60000); // Increase timeout for this test
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a fully refunded order
    const orderCount = await ordersPage.getOrderCount();
    let foundRefundedOrder = false;

    for (let i = 0; i < Math.min(orderCount, 10); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      
      // Wait for modal to be visible with longer timeout
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isFullyRefunded = orderStatus.toLowerCase() === 'refunded';
      
      if (isFullyRefunded) {
        foundRefundedOrder = true;
        
        // Refund button should NOT be visible
        const refundVisible = await ordersPage.isRefundButtonVisible();
        expect(refundVisible).toBeFalsy();
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundRefundedOrder) {
      test.skip(true, 'No fully refunded orders found');
    }
  });

  test('[REFUND] button should have correct text and icon', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Find an order with completed payment
    const orderCount = await ordersPage.getOrderCount();
    let foundValidOrder = false;

    for (let i = 0; i < Math.min(orderCount, 5); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.waitForTimeout(1500);
      
      const hasCompletedPayment = await ordersPage.hasCompletedPayment();
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isValidStatus = !orderStatus.toLowerCase().includes('cancelled') && 
                           !orderStatus.toLowerCase().includes('refunded');
      
      if (hasCompletedPayment && isValidStatus) {
        foundValidOrder = true;
        
        const refundVisible = await ordersPage.isRefundButtonVisible();
        
        if (refundVisible) {
          // Check button text
          const refundButton = page.locator('button:has-text("Process Refund")');
          const buttonText = await refundButton.textContent();
          expect(buttonText).toContain('Process Refund');
          
          // Check for icon (RefreshCw icon should be present)
          const icon = refundButton.locator('svg').first();
          expect(await icon.isVisible()).toBeTruthy();
          
          // Check button styling (destructive variant = red)
          const classes = await refundButton.getAttribute('class') || '';
          expect(classes).toContain('destructive');
        }
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(500);
    }

    if (!foundValidOrder) {
      test.skip(true, 'No valid orders found for testing');
    }
  });

  test('[REFUND] clicking refund button should open refund modal', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Find an order with refund button enabled
    const orderCount = await ordersPage.getOrderCount();
    let foundValidOrder = false;

    for (let i = 0; i < Math.min(orderCount, 5); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.waitForTimeout(1500);
      
      const refundVisible = await ordersPage.isRefundButtonVisible();
      const refundEnabled = await ordersPage.isRefundButtonEnabled();
      
      if (refundVisible && refundEnabled) {
        foundValidOrder = true;
        
        // Click refund button
        await ordersPage.clickRefundButton();
        await page.waitForTimeout(1000);
        
        // Check if refund modal opened
        const refundModal = page.getByRole('dialog').filter({ hasText: /process refund/i });
        expect(await refundModal.isVisible()).toBeTruthy();
        
        // Verify refund modal has key elements
        const amountInput = page.locator('input[type="number"]').first();
        expect(await amountInput.isVisible()).toBeTruthy();
        
        const reasonSelect = page.locator('text=/reason/i').locator('..').locator('button').first();
        expect(await reasonSelect.isVisible()).toBeTruthy();
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(500);
    }

    if (!foundValidOrder) {
      test.skip(true, 'No valid orders found with enabled refund button');
    }
  });
});

test.describe('Refund Button Best Practices', () => {
  test('[REFUND_BEST_PRACTICE] refund button should only be enabled after successful payment', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Test multiple orders to verify the pattern
    const orderCount = await ordersPage.getOrderCount();
    const testResults: { hasPayment: boolean; refundEnabled: boolean }[] = [];

    for (let i = 0; i < Math.min(orderCount, 5); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.waitForTimeout(1500);
      
      const hasCompletedPayment = await ordersPage.hasCompletedPayment();
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isValidStatus = !orderStatus.toLowerCase().includes('cancelled') && 
                           orderStatus.toLowerCase() !== 'refunded';
      const refundVisible = await ordersPage.isRefundButtonVisible();
      const refundEnabled = refundVisible && await ordersPage.isRefundButtonEnabled();
      
      testResults.push({
        hasPayment: hasCompletedPayment && isValidStatus,
        refundEnabled
      });
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(500);
    }

    // Verify: refund button should only be enabled when there's a completed payment
    testResults.forEach((result, index) => {
      if (result.hasPayment) {
        expect(result.refundEnabled, `Order ${index}: Should enable refund when payment completed`).toBeTruthy();
      } else {
        expect(result.refundEnabled, `Order ${index}: Should NOT enable refund without completed payment`).toBeFalsy();
      }
    });
  });
});
