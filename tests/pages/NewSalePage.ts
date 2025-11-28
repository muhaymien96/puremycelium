import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class NewSalePage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly searchInput: Locator;
  private readonly productCards: Locator;
  private readonly addToCartButtons: Locator;
  private readonly emptyCartMessage: Locator;
  private readonly paymentMethodSection: Locator;
  private readonly customerSelect: Locator;
  private readonly cartItems: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /new sale/i });
    this.searchInput = page.getByPlaceholder(/search products/i);
    this.productCards = page.locator('[data-testid="product-card"]');
    this.addToCartButtons = page.locator('button:has-text("Add to Cart")');
    this.emptyCartMessage = page.getByText(/cart is empty/i).or(page.getByText(/no items/i));
    this.paymentMethodSection = page.getByText(/payment method/i);
    this.customerSelect = page.getByRole('button', { name: /select customer/i }).or(page.getByPlaceholder(/customer/i));
    this.cartItems = page.locator('[data-testid="cart-item"]');
  }

  async goto() {
    await this.navigate('/sale');
  }

  async isNewSalePageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async isSearchVisible(): Promise<boolean> {
    return await this.isVisible(this.searchInput);
  }

  async isCartEmpty(): Promise<boolean> {
    return await this.isVisible(this.emptyCartMessage);
  }

  async addFirstProductToCart() {
    const firstProduct = this.productCards.first().or(this.addToCartButtons.first());
    if (await this.isVisible(firstProduct)) {
      await this.clickElement(firstProduct);
    }
  }

  async isPaymentMethodVisible(): Promise<boolean> {
    return await this.isVisible(this.paymentMethodSection);
  }

  async isCustomerSelectVisible(): Promise<boolean> {
    return await this.isVisible(this.customerSelect);
  }

  async searchProducts(query: string) {
    await this.fillInput(this.searchInput, query);
    await this.waitForTimeout(500);
  }

  async getCartItemCount(): Promise<number> {
    return await this.cartItems.count();
  }
}
