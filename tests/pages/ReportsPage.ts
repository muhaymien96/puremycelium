import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReportsPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly revenueText: Locator;
  private readonly charts: Locator;
  private readonly dateFilterButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /reports/i });
    this.revenueText = page.getByText(/revenue/i).first();
    this.charts = page.locator('svg');
    this.dateFilterButton = page.getByRole('button', { name: /date/i }).or(page.getByRole('button', { name: /period/i }));
  }

  async goto() {
    await this.navigate('/reports');
  }

  async isReportsPageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async areKPIsVisible(): Promise<boolean> {
    return await this.isVisible(this.revenueText);
  }

  async getChartCount(): Promise<number> {
    return await this.charts.count();
  }

  async clickDateFilter() {
    if (await this.isVisible(this.dateFilterButton)) {
      await this.clickElement(this.dateFilterButton);
    }
  }
}
