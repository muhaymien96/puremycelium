import { test, expect } from '../fixtures/fixtures';

test.describe('Cancel Order Functionality', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.ordersPage.goto();
    await authenticatedPageManager.getPage().waitForTimeout(1000);
  });

  test('[CANCEL_ORDER] should show cancel button for pending orders', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a pending order
    const orderCount = await ordersPage.getOrderCount();
    let foundPendingOrder = false;

    for (let i = 0; i < Math.min(orderCount, 10); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isPending = orderStatus.toLowerCase().includes('pending');
      
      if (isPending) {
        foundPendingOrder = true;
        
        // Cancel button should be visible
        const cancelVisible = await ordersPage.isCancelButtonVisible();
        expect(cancelVisible).toBeTruthy();
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundPendingOrder) {
      test.skip(true, 'No pending orders found');
    }
  });

  test('[CANCEL_ORDER] should show cancel button for confirmed orders', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a confirmed order
    const orderCount = await ordersPage.getOrderCount();
    let foundConfirmedOrder = false;

    for (let i = 0; i < Math.min(orderCount, 10); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isConfirmed = orderStatus.toLowerCase().includes('confirmed');
      
      if (isConfirmed) {
        foundConfirmedOrder = true;
        
        // Cancel button should be visible
        const cancelVisible = await ordersPage.isCancelButtonVisible();
        expect(cancelVisible).toBeTruthy();
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundConfirmedOrder) {
      test.skip(true, 'No confirmed orders found');
    }
  });

  test('[CANCEL_ORDER] should NOT show cancel button for completed orders', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a completed order
    const orderCount = await ordersPage.getOrderCount();
    let foundCompletedOrder = false;

    for (let i = 0; i < Math.min(orderCount, 10); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isCompleted = orderStatus.toLowerCase() === 'completed';
      
      if (isCompleted) {
        foundCompletedOrder = true;
        
        // Cancel button should NOT be visible
        const cancelVisible = await ordersPage.isCancelButtonVisible();
        expect(cancelVisible).toBeFalsy();
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundCompletedOrder) {
      test.skip(true, 'No completed orders found');
    }
  });

  test('[CANCEL_ORDER] should NOT show cancel button for already cancelled orders', async ({ authenticatedPageManager }) => {
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
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isCancelled = orderStatus.toLowerCase().includes('cancelled');
      
      if (isCancelled) {
        foundCancelledOrder = true;
        
        // Cancel button should NOT be visible
        const cancelVisible = await ordersPage.isCancelButtonVisible();
        expect(cancelVisible).toBeFalsy();
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundCancelledOrder) {
      test.skip(true, 'No cancelled orders found');
    }
  });

  test('[CANCEL_ORDER] clicking cancel button should show confirmation dialog', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a pending or confirmed order
    const orderCount = await ordersPage.getOrderCount();
    let foundCancellableOrder = false;

    for (let i = 0; i < Math.min(orderCount, 10); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isCancellable = orderStatus.toLowerCase().includes('pending') || 
                          orderStatus.toLowerCase().includes('confirmed');
      
      if (isCancellable) {
        foundCancellableOrder = true;
        
        const cancelVisible = await ordersPage.isCancelButtonVisible();
        
        if (cancelVisible) {
          // Click cancel button
          await ordersPage.clickCancelButton();
          await page.waitForTimeout(1000);
          
          // Confirmation dialog should be visible
          const dialogVisible = await ordersPage.isCancelDialogVisible();
          expect(dialogVisible).toBeTruthy();
          
          // Verify dialog has expected elements
          const dialogTitle = page.getByRole('alertdialog').getByText(/cancel order/i);
          expect(await dialogTitle.isVisible()).toBeTruthy();
          
          // Close dialog without confirming
          await ordersPage.dismissCancelDialog();
          await page.waitForTimeout(500);
        }
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundCancellableOrder) {
      test.skip(true, 'No cancellable orders found');
    }
  });

  test('[CANCEL_ORDER] cancel button should have correct styling and icon', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a pending or confirmed order
    const orderCount = await ordersPage.getOrderCount();
    let foundCancellableOrder = false;

    for (let i = 0; i < Math.min(orderCount, 5); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isCancellable = orderStatus.toLowerCase().includes('pending') || 
                          orderStatus.toLowerCase().includes('confirmed');
      
      if (isCancellable) {
        foundCancellableOrder = true;
        
        const cancelVisible = await ordersPage.isCancelButtonVisible();
        
        if (cancelVisible) {
          // Check button text
          const cancelButton = page.locator('button:has-text("Cancel Order")');
          const buttonText = await cancelButton.textContent();
          expect(buttonText).toContain('Cancel Order');
          
          // Check for XCircle icon
          const icon = cancelButton.locator('svg').first();
          expect(await icon.isVisible()).toBeTruthy();
          
          // Check button styling (outline variant with red styling)
          const classes = await cancelButton.getAttribute('class') || '';
          expect(classes).toContain('border-red-500');
          expect(classes).toContain('text-red-600');
        }
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundCancellableOrder) {
      test.skip(true, 'No cancellable orders found');
    }
  });

  test('[CANCEL_ORDER] dismissing cancel dialog should not cancel order', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a pending or confirmed order
    const orderCount = await ordersPage.getOrderCount();
    let foundCancellableOrder = false;

    for (let i = 0; i < Math.min(orderCount, 10); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const originalStatus = orderStatus;
      const isCancellable = orderStatus.toLowerCase().includes('pending') || 
                          orderStatus.toLowerCase().includes('confirmed');
      
      if (isCancellable) {
        foundCancellableOrder = true;
        
        const cancelVisible = await ordersPage.isCancelButtonVisible();
        
        if (cancelVisible) {
          // Click cancel button
          await ordersPage.clickCancelButton();
          await page.waitForTimeout(1000);
          
          // Dismiss dialog
          await ordersPage.dismissCancelDialog();
          await page.waitForTimeout(1000);
          
          // Order status should remain the same
          const newOrderStatus = await ordersPage.getOrderStatusBadgeText();
          expect(newOrderStatus).toBe(originalStatus);
        }
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundCancellableOrder) {
      test.skip(true, 'No cancellable orders found');
    }
  });

  test('[CANCEL_ORDER] confirmation dialog should warn when order has completed payment', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Try to find a pending/confirmed order with completed payment
    const orderCount = await ordersPage.getOrderCount();
    let foundOrderWithPayment = false;

    for (let i = 0; i < Math.min(orderCount, 10); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const isCancellable = orderStatus.toLowerCase().includes('pending') || 
                          orderStatus.toLowerCase().includes('confirmed');
      const hasCompletedPayment = await ordersPage.hasCompletedPayment();
      
      if (isCancellable && hasCompletedPayment) {
        foundOrderWithPayment = true;
        
        const cancelVisible = await ordersPage.isCancelButtonVisible();
        
        if (cancelVisible) {
          // Click cancel button
          await ordersPage.clickCancelButton();
          await page.waitForTimeout(1000);
          
          // Dialog should show warning about completed payment
          const warningText = page.getByRole('alertdialog').getByText(/completed payments/i);
          expect(await warningText.isVisible()).toBeTruthy();
          
          // Close dialog
          await ordersPage.dismissCancelDialog();
          await page.waitForTimeout(500);
        }
        
        break;
      }
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    if (!foundOrderWithPayment) {
      test.skip(true, 'No cancellable orders with completed payment found');
    }
  });
});

test.describe('Cancel Order Best Practices', () => {
  test('[CANCEL_ORDER_BEST_PRACTICE] cancel button should only appear for pending and confirmed orders', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    const ordersPage = authenticatedPageManager.ordersPage;
    
    const hasOrders = await ordersPage.hasOrders();
    
    if (!hasOrders) {
      test.skip(true, 'No orders available to test');
      return;
    }

    // Test multiple orders to verify the pattern
    const orderCount = await ordersPage.getOrderCount();
    const testResults: { status: string; cancelVisible: boolean; shouldShowCancel: boolean }[] = [];

    for (let i = 0; i < Math.min(orderCount, 5); i++) {
      await ordersPage.clickViewButtonByIndex(i);
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const orderStatus = await ordersPage.getOrderStatusBadgeText();
      const cancelVisible = await ordersPage.isCancelButtonVisible();
      const shouldShowCancel = orderStatus.toLowerCase().includes('pending') || 
                              orderStatus.toLowerCase().includes('confirmed');
      
      testResults.push({
        status: orderStatus,
        cancelVisible,
        shouldShowCancel
      });
      
      await ordersPage.closeOrderDetailModal();
      await page.waitForTimeout(1000);
    }

    // Verify: cancel button should only show for pending/confirmed orders
    testResults.forEach((result, index) => {
      if (result.shouldShowCancel) {
        expect(result.cancelVisible, `Order ${index} (${result.status}): Should show cancel button`).toBeTruthy();
      } else {
        expect(result.cancelVisible, `Order ${index} (${result.status}): Should NOT show cancel button`).toBeFalsy();
      }
    });
  });
});
