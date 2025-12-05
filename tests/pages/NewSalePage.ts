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
  private readonly cashPaymentButton: Locator;
  private readonly paymentLinkButton: Locator;
  private readonly sendToCustomerCheckbox: Locator;
  private readonly sendToCustomerLabel: Locator;
  private readonly completeSaleButton: Locator;
  private readonly addCustomerButton: Locator;

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
    this.cashPaymentButton = page.locator('button:has-text("Cash")');
    this.paymentLinkButton = page.locator('button:has-text("Payment Link")');
    this.sendToCustomerCheckbox = page.locator('#sendToCustomer');
    this.sendToCustomerLabel = page.locator('label[for="sendToCustomer"]');
    this.completeSaleButton = page.getByRole('button', { name: /complete sale/i });
    this.addCustomerButton = page.locator('button:has-text("Add New Customer")');
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

  async selectPaymentMethod(method: 'CASH' | 'PAYMENT_LINK') {
    switch (method) {
      case 'CASH':
        await this.clickElement(this.cashPaymentButton);
        break;
      case 'PAYMENT_LINK':
        await this.clickElement(this.paymentLinkButton);
        break;
    }
    await this.waitForTimeout(300);
  }

  async isPaymentMethodSelected(method: 'CASH' | 'PAYMENT_LINK'): Promise<boolean> {
    let button: Locator;
    switch (method) {
      case 'CASH':
        button = this.cashPaymentButton;
        break;
      case 'PAYMENT_LINK':
        button = this.paymentLinkButton;
        break;
    }
    const classes = await button.getAttribute('class') || '';
    return classes.includes('border-primary');
  }

  async isSendToCustomerCheckboxVisible(): Promise<boolean> {
    return await this.isVisible(this.sendToCustomerCheckbox);
  }

  async toggleSendToCustomer() {
    await this.clickElement(this.sendToCustomerCheckbox);
    await this.waitForTimeout(200);
  }

  async isSendToCustomerChecked(): Promise<boolean> {
    return await this.sendToCustomerCheckbox.isChecked();
  }

  async selectCustomer(customerName: string) {
    await this.clickElement(this.customerSelect);
    await this.waitForTimeout(300);
    await this.page.getByRole('option', { name: new RegExp(customerName, 'i') }).click();
    await this.waitForTimeout(300);
  }

  async clickCompleteSale() {
    await this.clickElement(this.completeSaleButton);
  }

  async isCompleteSaleEnabled(): Promise<boolean> {
    return await this.completeSaleButton.isEnabled();
  }

  async getTotal(): Promise<string> {
    const totalElement = this.page.locator('text=/Total/').locator('..');
    const text = await totalElement.textContent();
    return text?.match(/R\s*([\d.]+)/)?.[1] || '0';
  }

  async addProductByName(productName: string) {
    await this.searchProducts(productName);
    const productCard = this.page.locator(`text=${productName}`).first();
    const addButton = productCard.locator('xpath=ancestor::*').locator('button:has-text("Add to Cart")').first();
    await this.clickElement(addButton);
    await this.waitForTimeout(500);
  }
}
