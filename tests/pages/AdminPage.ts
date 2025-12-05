import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly userManagementTab: Locator;
  private readonly activityLogTab: Locator;
  private readonly settingsTab: Locator;
  
  // User Management
  private readonly userCards: Locator;
  private readonly userMenuButton: Locator;
  
  // Activity Log
  private readonly activityLogEntries: Locator;
  
  // Settings
  private readonly stockThresholdInput: Locator;
  private readonly expiryWarningInput: Locator;
  private readonly saveSettingsButton: Locator;
  private readonly editSettingsButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /admin/i }).first();
    this.userManagementTab = page.getByRole('tab', { name: /user management/i });
    this.activityLogTab = page.getByRole('tab', { name: /activity log/i });
    this.settingsTab = page.getByRole('tab', { name: /settings/i });
    
    // User Management
    this.userCards = page.locator('[class*="Card"]').filter({ has: page.locator('[class*="Avatar"]') });
    this.userMenuButton = page.getByRole('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    
    // Activity Log
    this.activityLogEntries = page.locator('[class*="Card"]').filter({ has: page.locator('text=/ago|just now/i') });
    
    // Settings
    this.stockThresholdInput = page.getByLabel(/stock.*threshold/i);
    this.expiryWarningInput = page.getByLabel(/expiry.*warning/i);
    this.saveSettingsButton = page.getByRole('button', { name: /save/i });
    this.editSettingsButton = page.getByRole('button', { name: /edit/i });
  }

  async goto() {
    await this.navigate('/admin');
  }

  async isAdminPageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async clickUserManagementTab() {
    await this.clickElement(this.userManagementTab);
  }

  async clickActivityLogTab() {
    await this.clickElement(this.activityLogTab);
  }

  async clickSettingsTab() {
    await this.clickElement(this.settingsTab);
  }

  async isUserManagementTabActive(): Promise<boolean> {
    const tabContent = this.page.getByRole('tabpanel');
    const hasUsers = await this.page.locator('text=/users|admin|user/i').first().isVisible().catch(() => false);
    return hasUsers;
  }

  async isActivityLogTabActive(): Promise<boolean> {
    return await this.activityLogEntries.first().isVisible().catch(() => false);
  }

  async isSettingsTabActive(): Promise<boolean> {
    const settingsContent = this.page.locator('text=/threshold|warning|settings/i').first();
    return await settingsContent.isVisible().catch(() => false);
  }

  async getUserCount(): Promise<number> {
    return await this.userCards.count();
  }

  async getActivityLogCount(): Promise<number> {
    return await this.activityLogEntries.count();
  }

  async editSettings(settings: {
    stockThreshold?: string;
    expiryWarning?: string;
  }) {
    // Click edit if there's an edit button
    if (await this.editSettingsButton.isVisible().catch(() => false)) {
      await this.editSettingsButton.click();
    }
    
    if (settings.stockThreshold) {
      await this.fillInput(this.stockThresholdInput, settings.stockThreshold);
    }
    
    if (settings.expiryWarning) {
      await this.fillInput(this.expiryWarningInput, settings.expiryWarning);
    }
  }

  async saveSettings() {
    await this.clickElement(this.saveSettingsButton);
  }
}
