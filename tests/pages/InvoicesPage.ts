import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class InvoicesPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly invoiceTable: Locator;
  private readonly invoiceTableBody: Locator;
  private readonly statusFilterSelect: Locator;
  private readonly deliveryStatusFilterSelect: Locator;
  private readonly refreshButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /invoices/i });
    this.invoiceTable = page.getByRole('table');
    this.invoiceTableBody = page.locator('tbody');
    this.statusFilterSelect = page.locator('button[role="combobox"]').filter({ hasText: /all.*status|paid|unpaid/i }).first();
    this.deliveryStatusFilterSelect = page.locator('button[role="combobox"]').filter({ hasText: /all.*delivery|sent|pending|failed/i }).first();
    this.refreshButton = page.getByRole('button').filter({ has: page.locator('svg.lucide-refresh-cw') });
  }

  async goto() {
    await this.navigate('/invoices');
  }

  async isInvoicesPageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async getInvoiceCount(): Promise<number> {
    const rows = this.invoiceTableBody.locator('tr');
    return await rows.count();
  }

  async filterByStatus(status: 'all' | 'paid' | 'unpaid') {
    await this.statusFilterSelect.click();
    await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
  }

  async filterByDeliveryStatus(status: 'all' | 'sent' | 'pending' | 'failed') {
    await this.deliveryStatusFilterSelect.click();
    await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
  }

  async refresh() {
    await this.clickElement(this.refreshButton);
  }

  async isInvoiceVisible(invoiceNumber: string): Promise<boolean> {
    const invoice = this.page.getByText(invoiceNumber);
    return await this.isVisible(invoice);
  }

  async hasUnpaidInvoices(): Promise<boolean> {
    const unpaidBadge = this.invoiceTableBody.locator('text=UNPAID');
    return await unpaidBadge.first().isVisible().catch(() => false);
  }

  async hasPaidInvoices(): Promise<boolean> {
    const paidBadge = this.invoiceTableBody.locator('text=PAID');
    return await paidBadge.first().isVisible().catch(() => false);
  }

  async clickDownload(invoiceNumber: string) {
    const row = this.invoiceTableBody.locator('tr').filter({ hasText: invoiceNumber });
    const downloadButton = row.getByRole('button').filter({ has: this.page.locator('svg.lucide-download') });
    await downloadButton.click();
  }

  async clickResend(invoiceNumber: string) {
    const row = this.invoiceTableBody.locator('tr').filter({ hasText: invoiceNumber });
    const resendButton = row.getByRole('button').filter({ has: this.page.locator('svg.lucide-refresh-cw') });
    await resendButton.click();
  }

  async clickViewOrder(invoiceNumber: string) {
    const row = this.invoiceTableBody.locator('tr').filter({ hasText: invoiceNumber });
    const viewButton = row.getByRole('button').filter({ has: this.page.locator('svg.lucide-eye') });
    await viewButton.click();
  }

  async getTableContent(): Promise<string> {
    return await this.invoiceTableBody.textContent() || '';
  }
}
