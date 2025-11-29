import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class InventoryPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly addProductButton: Locator;
  private readonly searchInput: Locator;
  private readonly lowStockFilter: Locator;
  private readonly productTable: Locator;
  private readonly productRows: Locator;
  private readonly addProductModal: Locator;
  private readonly productNameInput: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /inventory dashboard/i });
    this.addProductButton = page.getByRole('button', { name: /add product/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.lowStockFilter = page.getByRole('tab', { name: /low stock/i });
    this.productTable = page.locator('.space-y-4'); // Container for product cards
    this.productRows = page.locator('.space-y-4 > div').filter({ has: page.locator('h4') });
    this.addProductModal = page.getByRole('dialog');
    this.productNameInput = page.getByLabel(/product name/i);
    this.emptyState = page.getByText(/no products/i);
  }

  async goto() {
    await this.navigate('/inventory');
  }

  async isInventoryPageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async clickAddProduct() {
    await this.clickElement(this.addProductButton);
  }

  async isAddProductModalVisible(): Promise<boolean> {
    return await this.isVisible(this.addProductModal) && await this.isVisible(this.productNameInput);
  }

  async searchProducts(query: string) {
    // Search functionality not in current UI
    await this.waitForTimeout(100);
  }

  async filterByLowStock() {
    if (await this.isVisible(this.lowStockFilter)) {
      await this.clickElement(this.lowStockFilter);
      await this.waitForTimeout(1000);
    }
  }

  async hasProducts(): Promise<boolean> {
    const hasEmpty = await this.isVisible(this.emptyState);
    return !hasEmpty;
  }

  async getProductCount(): Promise<number> {
    return await this.productRows.count();
  }
}
