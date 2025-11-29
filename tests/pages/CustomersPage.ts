import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CustomersPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly addCustomerButton: Locator;
  private readonly customerCards: Locator;
  private readonly addCustomerModal: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /^customers$/i });
    this.addCustomerButton = page.getByRole('button', { name: /add customer/i });
    this.customerCards = page.locator('.space-y-6 > div').filter({ has: page.locator('h3') });
    this.addCustomerModal = page.getByRole('dialog');
    this.emptyState = page.getByText(/no customers/i);
  }

  async goto() {
    await this.navigate('/customers');
  }

  async isCustomersPageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async clickAddCustomer() {
    await this.clickElement(this.addCustomerButton);
  }

  async isAddCustomerModalVisible(): Promise<boolean> {
    return await this.isVisible(this.addCustomerModal);
  }

  async searchCustomers(query: string) {
    // Search functionality not implemented in current UI
    // This is a placeholder for when search is added
    await this.waitForTimeout(100);
  }

  async clickFirstCustomer() {
    const firstCard = this.customerCards.first();
    if (await this.isVisible(firstCard)) {
      await this.clickElement(firstCard);
      await this.page.waitForTimeout(1000); // Wait for navigation
    }
  }

  async hasCustomers(): Promise<boolean> {
    return (await this.customerCards.count()) > 0;
  }

  async isCustomerDetailPage(): Promise<boolean> {
    return this.page.url().includes('/customers/') && this.page.url().split('/').length > 4;
  }
}
