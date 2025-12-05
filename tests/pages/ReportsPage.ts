import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReportsPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly revenueText: Locator;
  private readonly dateFilterButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // Reports page heading could be "Reports" or "Business Report"
    this.pageHeading = page.getByRole('heading', { name: /report/i });
    this.revenueText = page.getByText(/revenue/i).first();
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

  /**
   * Count visible chart elements
   * Looks for SVG charts, canvas elements, or recharts containers
   */
  async getChartCount(): Promise<number> {
    // Look for various chart implementations
    const svgCharts = await this.page.locator('svg.recharts-surface, [class*="chart"] svg, [class*="Chart"] svg').count();
    const canvasCharts = await this.page.locator('canvas').count();
    const rechartsContainers = await this.page.locator('.recharts-wrapper, [class*="recharts"]').count();
    
    // Return the highest count (charts may be detected by multiple selectors)
    return Math.max(svgCharts, canvasCharts, rechartsContainers);
  }

  async clickDateFilter() {
    if (await this.isVisible(this.dateFilterButton)) {
      await this.clickElement(this.dateFilterButton);
    }
  }
}
