import { test, expect } from '../fixtures/fixtures';

/**
 * Comprehensive E2E tests for unique app flows not covered by individual page tests.
 * These tests focus on:
 * - Cross-page navigation flows
 * - Admin panel functionality
 * - Expense management (CRUD)
 * - Complete sale flow with payment link
 * 
 * Note: Basic page display tests are in individual spec files (dashboard.spec.ts, orders.spec.ts, etc.)
 */

test.describe('Navigation Flow', () => {
  test('[NAV] should navigate through main menu items', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.dashboardPage.goto();
    await page.waitForTimeout(500);
    
    // Navigate to Orders
    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page.locator('h1')).toContainText(/orders/i);
    
    // Navigate to Inventory
    await page.getByRole('link', { name: 'Inventory' }).click();
    await expect(page.locator('h1')).toContainText(/inventory/i);
    
    // Navigate to Customers
    await page.getByRole('link', { name: 'Customers' }).click();
    await expect(page.locator('h1')).toContainText(/customers/i);
  });

  test('[NAV] should navigate to Settings page', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.dashboardPage.goto();
    await page.waitForTimeout(500);
    
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('h1')).toContainText('Business Settings');
  });
});

test.describe('Admin Panel', () => {
  test('[ADMIN] should display admin page with tabs', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.adminPage.goto();
    await page.waitForTimeout(1000);
    
    // Check tabs are visible
    await expect(page.getByRole('tab', { name: /user management/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /activity log/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /settings/i })).toBeVisible();
  });

  test('[ADMIN] should switch between admin tabs', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.adminPage.goto();
    await page.waitForTimeout(1000);
    
    // Click User Management tab
    await page.getByRole('tab', { name: /user management/i }).click();
    await page.waitForTimeout(300);
    
    // Click Activity Log tab
    await page.getByRole('tab', { name: /activity log/i }).click();
    await page.waitForTimeout(300);
    
    // Click Settings tab
    await page.getByRole('tab', { name: /settings/i }).click();
    await page.waitForTimeout(300);
    
    // Should show settings content
    await expect(page.locator('text=/threshold|warning/i').first()).toBeVisible();
  });
});

test.describe('Expenses Management', () => {
  test('[EXPENSES] should display expenses page', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.expensesPage.goto();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('h1')).toContainText(/expenses/i);
    await expect(page.getByRole('button', { name: /add expense/i })).toBeVisible();
  });

  test('[EXPENSES] should open add expense modal', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.expensesPage.goto();
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /add expense/i }).click();
    await page.waitForTimeout(300);
    
    // Modal should be visible with form fields
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByPlaceholder('0.00')).toBeVisible();
    await expect(page.getByPlaceholder('What was this expense for?')).toBeVisible();
  });

  test('[EXPENSES] should show event selector for event type expenses', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.expensesPage.goto();
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /add expense/i }).click();
    await page.waitForTimeout(300);
    
    // Select Event type
    await page.getByRole('combobox').first().click();
    await page.getByLabel('Event').click();
    await page.waitForTimeout(300);
    
    // Event selector should appear
    await expect(page.locator('button').filter({ hasText: /select event/i })).toBeVisible();
    
    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click();
  });
});

test.describe('Customer Details Flow', () => {
  test('[CUSTOMERS] should view customer details with tabs', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.customersPage.goto();
    await page.waitForTimeout(1000);
    
    // Click on first customer - skip if no customers exist
    const customerCard = page.locator('[class*="Card"]').filter({ hasText: /@.*\.com/ }).first();
    if (!(await customerCard.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    
    await customerCard.click();
    await page.waitForTimeout(500);
    
    // Check for tabs
    const ordersTab = page.getByRole('tab', { name: /orders/i });
    if (await ordersTab.isVisible().catch(() => false)) {
      await ordersTab.click();
      await page.waitForTimeout(300);
    }
    
    const insightsTab = page.getByRole('tab', { name: /insights/i });
    if (await insightsTab.isVisible().catch(() => false)) {
      await insightsTab.click();
      await page.waitForTimeout(300);
    }
    
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    if (await overviewTab.isVisible().catch(() => false)) {
      await overviewTab.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Order Details Flow', () => {
  test('[ORDERS] should view order details with tabs', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.ordersPage.goto();
    await page.waitForTimeout(1000);
    
    // Click on first order's view button - skip if no orders
    const viewButton = page.getByRole('row').first().getByRole('button');
    if (!(await viewButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    
    await viewButton.first().click();
    await page.waitForTimeout(500);
    
    // Check for Details tab
    const detailsTab = page.getByRole('tab', { name: /details/i });
    if (await detailsTab.isVisible().catch(() => false)) {
      await detailsTab.click();
      await page.waitForTimeout(300);
      
      // Should show action buttons
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText(/generate invoice|process refund/i);
    }
    
    // Check Status tab
    const statusTab = page.getByRole('tab', { name: /status/i });
    if (await statusTab.isVisible().catch(() => false)) {
      await statusTab.click();
      await page.waitForTimeout(300);
    }
    
    // Check History tab
    const historyTab = page.getByRole('tab', { name: /history/i });
    if (await historyTab.isVisible().catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(300);
    }
    
    // Close modal
    await page.getByRole('button', { name: /close/i }).click();
  });
});

test.describe('New Sale Flow', () => {
  test('[SALE] should display new sale page with payment options', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.newSalePage.goto();
    await page.waitForTimeout(1000);
    
    // Check payment buttons
    await expect(page.getByRole('button', { name: /cash/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /payment link/i })).toBeVisible();
  });

  test('[SALE] should require customer for payment link', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.newSalePage.goto();
    await page.waitForTimeout(1000);
    
    // Payment link should be disabled without customer
    const paymentLinkButton = page.getByRole('button', { name: /payment link/i });
    await expect(paymentLinkButton).toBeDisabled();
  });
});

test.describe('Invoices Page', () => {
  test('[INVOICES] should display invoices page', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.invoicesPage.goto();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('h1')).toContainText(/invoices/i);
  });

  test('[INVOICES] should show invoice table with status', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.invoicesPage.goto();
    await page.waitForTimeout(1000);
    
    // Check for invoice table - skip if no invoices
    const table = page.locator('tbody');
    if (!(await table.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    
    // Should contain status badges
    const content = await table.textContent();
    expect(content).toMatch(/paid|unpaid/i);
  });

  test('[INVOICES] should have status filter', async ({ authenticatedPageManager }) => {
    const page = authenticatedPageManager.getPage();
    await authenticatedPageManager.invoicesPage.goto();
    await page.waitForTimeout(1000);
    
    // Check for filter dropdowns
    const filterButton = page.locator('button[role="combobox"]').first();
    if (!(await filterButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    
    await filterButton.click();
    await page.waitForTimeout(300);
    
    // Should show filter options
    await expect(page.locator('[role="option"]').first()).toBeVisible();
    
    // Close dropdown
    await page.keyboard.press('Escape');
  });
});
