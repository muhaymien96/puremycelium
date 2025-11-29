import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  // Locators
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly fullNameInput: Locator;
  private readonly signInButton: Locator;
  private readonly signUpButton: Locator;
  private readonly signInTabButton: Locator;
  private readonly signUpTabButton: Locator;
  private readonly pageHeading: Locator;
  private readonly errorMessage: Locator;
  private readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators - using IDs for more reliable selection
    this.emailInput = page.locator('#signin-email, #signup-email').first();
    this.passwordInput = page.locator('#signin-password, #signup-password').first();
    this.fullNameInput = page.locator('#signup-name');
    this.signInButton = page.getByRole('button', { name: /^Sign In$/i }).last();
    this.signUpButton = page.getByRole('button', { name: /^Sign Up$/i }).last();
    this.signInTabButton = page.getByRole('tab', { name: /Sign In/i });
    this.signUpTabButton = page.getByRole('tab', { name: /Sign Up/i });
    this.pageHeading = page.getByRole('heading', { level: 1 });
    this.errorMessage = page.getByText(/invalid email or password/i);
    this.successMessage = page.getByText(/account created/i);
  }

  async goto() {
    await this.navigate('/auth');
  }

  async signIn(email: string, password: string) {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.clickElement(this.signInButton);
  }

  async signUp(fullName: string, email: string, password: string) {
    await this.switchToSignUp();
    await this.fillInput(this.fullNameInput, fullName);
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.clickElement(this.signUpButton);
  }

  async switchToSignUp() {
    await this.clickElement(this.signUpTabButton);
  }

  async switchToSignIn() {
    await this.clickElement(this.signInTabButton);
  }

  async getHeadingText(): Promise<string> {
    return await this.getText(this.pageHeading);
  }

  async isSignInPage(): Promise<boolean> {
    // Check if Sign In tab is selected (has data-state="active")
    const isSelected = await this.signInTabButton.getAttribute('data-state');
    return isSelected === 'active';
  }

  async isSignUpPage(): Promise<boolean> {
    // Check if Sign Up tab is selected (has data-state="active")
    const isSelected = await this.signUpTabButton.getAttribute('data-state');
    return isSelected === 'active';
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }

  async isSuccessVisible(): Promise<boolean> {
    return await this.isVisible(this.successMessage);
  }

  async waitForRedirectToDashboard() {
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  async isFullNameFieldVisible(): Promise<boolean> {
    return await this.isVisible(this.fullNameInput);
  }
}
