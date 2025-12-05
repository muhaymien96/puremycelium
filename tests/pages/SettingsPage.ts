import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly profileTabs: Locator;
  private readonly businessNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly addressInput: Locator;
  private readonly saveButton: Locator;
  private readonly logoUploadButton: Locator;
  private readonly addProfileButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /business settings/i });
    this.profileTabs = page.getByRole('tablist');
    this.businessNameInput = page.getByLabel(/business name/i);
    this.emailInput = page.getByLabel(/email/i).first();
    this.phoneInput = page.getByLabel(/phone/i);
    this.addressInput = page.getByLabel(/address/i);
    this.saveButton = page.getByRole('button', { name: /save|update/i });
    this.logoUploadButton = page.getByRole('button', { name: /upload.*logo|change.*logo/i });
    this.addProfileButton = page.getByRole('button', { name: /add.*profile|new.*profile/i });
  }

  async goto() {
    await this.navigate('/settings');
  }

  async isSettingsPageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async selectProfile(profileName: string) {
    const tab = this.page.getByRole('tab', { name: new RegExp(profileName, 'i') });
    await this.clickElement(tab);
  }

  async fillBusinessName(name: string) {
    await this.fillInput(this.businessNameInput, name);
  }

  async fillEmail(email: string) {
    await this.fillInput(this.emailInput, email);
  }

  async fillPhone(phone: string) {
    await this.fillInput(this.phoneInput, phone);
  }

  async fillAddress(address: string) {
    await this.fillInput(this.addressInput, address);
  }

  async saveSettings() {
    await this.clickElement(this.saveButton);
  }

  async getBusinessName(): Promise<string> {
    return await this.businessNameInput.inputValue();
  }

  async getEmail(): Promise<string> {
    return await this.emailInput.inputValue();
  }

  async getProfileCount(): Promise<number> {
    const tabs = this.profileTabs.getByRole('tab');
    return await tabs.count();
  }

  async addNewProfile() {
    await this.clickElement(this.addProfileButton);
  }
}
