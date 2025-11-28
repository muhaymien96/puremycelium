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

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /orders/i });
    this.searchInput = page.getByPlaceholder(/search orders/i);
    this.filterButton = page.getByRole('button', { name: /filter/i }).or(page.getByRole('button', { name: /all/i }));
    this.orderTable = page.locator('table');
    this.orderRows = page.locator('table tbody tr');
    this.orderDetailModal = page.getByRole('dialog');
    this.emptyState = page.getByText(/no orders/i);
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
}
