import { test, expect } from '../fixtures/fixtures';

test.describe('Payment Link UI', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.goto();
    await authenticatedPageManager.getPage().waitForTimeout(1000);
  });

  test('[PAYMENT_LINK] should display payment link option', async ({ authenticatedPageManager }) => {
    const paymentLinkButton = authenticatedPageManager.getPage().locator('button:has-text("Payment Link")');
    expect(await paymentLinkButton.isVisible()).toBeTruthy();
  });

  test('[PAYMENT_LINK] should select payment link method', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    
    const isSelected = await authenticatedPageManager.newSalePage.isPaymentMethodSelected('PAYMENT_LINK');
    expect(isSelected).toBeTruthy();
  });

  test('[PAYMENT_LINK] should show "Send to customer" checkbox when payment link selected', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    
    const checkboxVisible = await authenticatedPageManager.newSalePage.isSendToCustomerCheckboxVisible();
    expect(checkboxVisible).toBeTruthy();
  });

  test('[PAYMENT_LINK] should hide "Send to customer" checkbox when other payment method selected', async ({ authenticatedPageManager }) => {
    // First select payment link
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    expect(await authenticatedPageManager.newSalePage.isSendToCustomerCheckboxVisible()).toBeTruthy();
    
    // Then select cash
    await authenticatedPageManager.newSalePage.selectPaymentMethod('CASH');
    
    // Checkbox should not be visible
    const checkboxVisible = await authenticatedPageManager.newSalePage.isSendToCustomerCheckboxVisible();
    expect(checkboxVisible).toBeFalsy();
  });

  test('[PAYMENT_LINK] should toggle "Send to customer" checkbox', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    
    // Initially unchecked
    expect(await authenticatedPageManager.newSalePage.isSendToCustomerChecked()).toBeFalsy();
    
    // Check it
    await authenticatedPageManager.newSalePage.toggleSendToCustomer();
    expect(await authenticatedPageManager.newSalePage.isSendToCustomerChecked()).toBeTruthy();
    
    // Uncheck it
    await authenticatedPageManager.newSalePage.toggleSendToCustomer();
    expect(await authenticatedPageManager.newSalePage.isSendToCustomerChecked()).toBeFalsy();
  });

  test('[PAYMENT_LINK] payment link checkbox should appear when selected', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    await page.waitForTimeout(500);
    
    const checkboxVisible = await authenticatedPageManager.newSalePage.isSendToCustomerCheckboxVisible();
    expect(checkboxVisible).toBeTruthy();
  });

  test('[PAYMENT_LINK] should display correct icon for payment link', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    const paymentLinkButton = page.locator('button:has-text("Payment Link")');
    const icon = paymentLinkButton.locator('svg').first();
    
    expect(await icon.isVisible()).toBeTruthy();
  });

  test('[PAYMENT_LINK] should maintain payment method selection when adding more products', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    expect(await authenticatedPageManager.newSalePage.isPaymentMethodSelected('PAYMENT_LINK')).toBeTruthy();
    
    // Add another product
    await authenticatedPageManager.newSalePage.addFirstProductToCart();
    await authenticatedPageManager.getPage().waitForTimeout(1000);
    
    // Payment method should still be selected
    expect(await authenticatedPageManager.newSalePage.isPaymentMethodSelected('PAYMENT_LINK')).toBeTruthy();
  });

  test('[PAYMENT_LINK] should uncheck "Send to customer" when switching payment methods', async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    await authenticatedPageManager.newSalePage.toggleSendToCustomer();
    
    expect(await authenticatedPageManager.newSalePage.isSendToCustomerChecked()).toBeTruthy();
    
    // Switch to cash
    await authenticatedPageManager.newSalePage.selectPaymentMethod('CASH');
    
    // Switch back to payment link
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    
    // Checkbox should be unchecked
    expect(await authenticatedPageManager.newSalePage.isSendToCustomerChecked()).toBeFalsy();
  });

  test('[PAYMENT_LINK] should display all payment method options', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    const cashButton = page.locator('button:has-text("Cash")');
    const cardButton = page.locator('button:has-text("Card (Yoco Terminal)")');
    const linkButton = page.locator('button:has-text("Payment Link")');
    
    expect(await cashButton.isVisible()).toBeTruthy();
    expect(await cardButton.isVisible()).toBeTruthy();
    expect(await linkButton.isVisible()).toBeTruthy();
  });

  test('[PAYMENT_LINK] should show mail icon in "Send to customer" option', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    
    const mailIcon = page.locator('label[for="sendToCustomer"]').locator('svg').first();
    expect(await mailIcon.isVisible()).toBeTruthy();
  });

  test('[PAYMENT_LINK] should have proper styling when selected', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    const paymentLinkButton = page.locator('button:has-text("Payment Link")');
    
    // Not selected initially
    let classes = await paymentLinkButton.getAttribute('class') || '';
    expect(classes.includes('border-primary')).toBeFalsy();
    
    // Select it
    await authenticatedPageManager.newSalePage.selectPaymentMethod('PAYMENT_LINK');
    
    // Should have selected styling
    classes = await paymentLinkButton.getAttribute('class') || '';
    expect(classes.includes('border-primary')).toBeTruthy();
  });
});

test.describe('Payment Link Integration Flow', () => {
  test.beforeEach(async ({ authenticatedPageManager }) => {
    await authenticatedPageManager.newSalePage.goto();
    await authenticatedPageManager.getPage().waitForTimeout(1000);
  });

  test('[PAYMENT_LINK_FLOW] should show payment link UI elements throughout flow', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    
    // Verify payment link button exists
    const paymentLinkButton = page.locator('button:has-text("Payment Link")');
    expect(await paymentLinkButton.isVisible()).toBeTruthy();
    
    // Click it
    await paymentLinkButton.click();
    await page.waitForTimeout(500);
    
    // Verify checkbox appears
    const checkbox = page.locator('#sendToCustomer');
    expect(await checkbox.isVisible()).toBeTruthy();
    
    // Verify customer select is present
    const customerSection = page.locator('text=/customer/i').first();
    expect(await customerSection.isVisible()).toBeTruthy();
  });
});
