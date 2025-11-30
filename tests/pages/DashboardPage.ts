import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly netRevenueStat: Locator;
  private readonly grossSalesStat: Locator;
  private readonly refundsStat: Locator;
  private readonly profitMarginStat: Locator;
  private readonly ordersStat: Locator;
  private readonly customersStat: Locator;
  private readonly activeProductsStat: Locator;
  private readonly stockValueStat: Locator;
  private readonly ordersLink: Locator;
  private readonly inventoryLink: Locator;
  private readonly customersLink: Locator;
  private readonly reportsLink: Locator;
  private readonly newSaleLink: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /dashboard/i });
    this.netRevenueStat = page.getByText(/net revenue/i).first();
    this.grossSalesStat = page.getByText(/gross sales/i).first();
    this.refundsStat = page.getByText(/refunds/i).first();
    this.profitMarginStat = page.getByText(/profit margin/i).first();
    this.ordersStat = page.getByText(/^orders$/i).first();
    this.customersStat = page.getByText(/^customers$/i).first();
    this.activeProductsStat = page.getByText(/active products/i).first();
    this.stockValueStat = page.getByText(/stock value \(cost\)/i).first();
    // Navigation links in sidebar - use more specific selectors
    this.ordersLink = page.locator('a[href="/orders"]').first();
    this.inventoryLink = page.locator('a[href="/inventory"]').first();
    this.customersLink = page.locator('a[href="/customers"]').first();
    this.reportsLink = page.locator('a[href="/reports"]').first();
    this.newSaleLink = page.locator('a[href="/sale"]').first();
  }

  async goto() {
    await this.navigate('/dashboard');
  }

  async isDashboardVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async areStatsVisible(): Promise<boolean> {
    return (
      (await this.isVisible(this.netRevenueStat)) &&
      (await this.isVisible(this.grossSalesStat)) &&
      (await this.isVisible(this.refundsStat)) &&
      (await this.isVisible(this.profitMarginStat)) &&
      (await this.isVisible(this.ordersStat)) &&
      (await this.isVisible(this.customersStat)) &&
      (await this.isVisible(this.activeProductsStat)) &&
      (await this.isVisible(this.stockValueStat))
    );
  }

  async navigateToOrders() {
    await this.clickElement(this.ordersLink);
    await this.page.waitForURL('**/orders');
  }

  async navigateToInventory() {
    await this.clickElement(this.inventoryLink);
    await this.page.waitForURL('**/inventory');
  }

  async navigateToCustomers() {
    await this.clickElement(this.customersLink);
    await this.page.waitForURL('**/customers');
  }

  async navigateToReports() {
    await this.clickElement(this.reportsLink);
    await this.page.waitForURL('**/reports');
  }

  async navigateToNewSale() {
    await this.clickElement(this.newSaleLink);
    await this.page.waitForURL('**/sale');
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}
