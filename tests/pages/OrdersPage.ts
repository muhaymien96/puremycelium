import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class OrdersPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly searchInput: Locator;
  private readonly filterButton: Locator;
  private readonly orderTable: Locator;
  private readonly orderRows: Locator;
  private readonly orderDetailModal: Locator;
  private readonly emptyState: Locator;
  private readonly refundButton: Locator;
  private readonly cancelButton: Locator;
  private readonly orderStatus: Locator;
  private readonly paymentStatusBadge: Locator;
  private readonly viewButtons: Locator;
  private readonly cancelConfirmButton: Locator;
  private readonly cancelDialogCancelButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /orders/i });
    this.searchInput = page.getByPlaceholder(/search orders/i);
    this.filterButton = page.getByRole('button', { name: /filter/i }).or(page.getByRole('button', { name: /all/i }));
    this.orderTable = page.locator('table');
    this.orderRows = page.locator('table tbody tr');
    this.orderDetailModal = page.getByRole('dialog');
    this.emptyState = page.getByText(/no orders/i);
    this.refundButton = page.locator('button:has-text("Process Refund")');
    this.cancelButton = page.locator('button:has-text("Cancel Order")');
    this.orderStatus = page.locator('[role="dialog"]').getByText(/status/i).first();
    this.paymentStatusBadge = page.locator('[role="dialog"]').locator('text=/completed|pending|failed/i');
    this.viewButtons = page.locator('button:has-text("View")');
    this.cancelConfirmButton = page.locator('button:has-text("Yes, cancel order")');
    this.cancelDialogCancelButton = page.locator('button:has-text("No, keep order")');
  }

  async goto() {
    await this.navigate('/orders');
  }

  async isOrdersPageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async searchOrders(query: string) {
    await this.fillInput(this.searchInput, query);
    await this.waitForTimeout(500);
  }

  async clickFilterButton() {
    if (await this.isVisible(this.filterButton)) {
      await this.clickElement(this.filterButton);
    }
  }

  async clickFirstOrder() {
    const firstRow = this.orderRows.first();
    if (await this.isVisible(firstRow)) {
      await this.clickElement(firstRow);
    }
  }

  async isOrderDetailModalVisible(): Promise<boolean> {
    return await this.isVisible(this.orderDetailModal);
  }

  async hasOrders(): Promise<boolean> {
    return (await this.orderRows.count()) > 0;
  }

  async getOrderCount(): Promise<number> {
    return await this.orderRows.count();
  }

  async openOrderByIndex(index: number) {
    const row = this.orderRows.nth(index);
    await this.clickElement(row);
    await this.waitForTimeout(1000);
  }

  async clickViewButtonByIndex(index: number) {
    const viewButton = this.viewButtons.nth(index);
    await this.clickElement(viewButton);
    await this.waitForTimeout(1000);
  }

  async isRefundButtonVisible(): Promise<boolean> {
    await this.waitForTimeout(500);
    return await this.refundButton.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async isRefundButtonEnabled(): Promise<boolean> {
    if (!await this.isRefundButtonVisible()) return false;
    return await this.refundButton.isEnabled();
  }

  async clickRefundButton() {
    await this.clickElement(this.refundButton);
    await this.waitForTimeout(500);
  }

  async getOrderStatusInModal(): Promise<string | null> {
    const statusBadges = this.page.locator('[role="dialog"] [class*="bg-"][class*="text-"]');
    const count = await statusBadges.count();
    if (count > 0) {
      const text = await statusBadges.first().textContent();
      return text?.toLowerCase() || null;
    }
    return null;
  }

  async hasCompletedPayment(): Promise<boolean> {
    // Look for payment section with "completed" badge
    const paymentsSection = this.page.locator('text=/payments/i').locator('..');
    const completedBadge = paymentsSection.locator('text=/completed/i').first();
    return await completedBadge.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async closeOrderDetailModal() {
    // Click outside the modal or press Escape
    await this.page.keyboard.press('Escape');
    await this.waitForTimeout(500);
  }

  async getOrderStatusBadgeText(): Promise<string> {
    const badge = this.page.locator('[role="dialog"]').locator('[class*="border-"]').first();
    return (await badge.textContent()) || '';
  }

  async isCancelButtonVisible(): Promise<boolean> {
    await this.waitForTimeout(500);
    return await this.cancelButton.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async isCancelButtonEnabled(): Promise<boolean> {
    if (!await this.isCancelButtonVisible()) return false;
    return await this.cancelButton.isEnabled();
  }

  async clickCancelButton() {
    await this.clickElement(this.cancelButton);
    await this.waitForTimeout(500);
  }

  async isCancelDialogVisible(): Promise<boolean> {
    const dialog = this.page.getByRole('alertdialog');
    return await dialog.isVisible({ timeout: 2000 }).catch(() => false);
  }

  async confirmCancelOrder() {
    await this.clickElement(this.cancelConfirmButton);
    await this.waitForTimeout(1000);
  }

  async dismissCancelDialog() {
    await this.clickElement(this.cancelDialogCancelButton);
    await this.waitForTimeout(500);
  }
}
