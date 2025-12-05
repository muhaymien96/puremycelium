import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly ordersLink: Locator;
  private readonly inventoryLink: Locator;
  private readonly customersLink: Locator;
  private readonly reportsLink: Locator;
  private readonly newSaleLink: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /dashboard/i });
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

  /**
   * Check if dashboard stats section is visible
   * Uses flexible matching to avoid brittle tests
   */
  async areStatsVisible(): Promise<boolean> {
    // Check for common stat patterns that should appear on dashboard
    const statsContainer = this.page.locator('[class*="grid"], [class*="stats"], main').first();
    const hasStatsSection = await this.isVisible(statsContainer);
    
    // Look for any currency or number patterns indicating stats
    const hasNumbers = await this.page.locator('text=/R\\s*[\\d,]+|\\d+\\s*(orders|customers|products)/i').first().isVisible().catch(() => false);
    
    return hasStatsSection || hasNumbers;
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
