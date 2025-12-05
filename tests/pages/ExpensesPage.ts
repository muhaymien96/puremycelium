import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ExpensesPage extends BasePage {
  // Locators
  private readonly pageHeading: Locator;
  private readonly addExpenseButton: Locator;
  private readonly dateRangePicker: Locator;
  private readonly typeFilterSelect: Locator;
  private readonly totalExpensesCard: Locator;
  
  // Modal locators
  private readonly expenseModal: Locator;
  private readonly expenseTypeSelect: Locator;
  private readonly amountInput: Locator;
  private readonly dateInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly eventSelect: Locator;
  private readonly notesInput: Locator;
  private readonly addExpenseSubmitButton: Locator;
  private readonly cancelButton: Locator;
  
  // Delete dialog
  private readonly deleteDialog: Locator;
  private readonly confirmDeleteButton: Locator;
  private readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageHeading = page.getByRole('heading', { name: /expenses/i });
    this.addExpenseButton = page.getByRole('button', { name: /add expense/i });
    this.dateRangePicker = page.getByRole('button', { name: /pick a date range/i });
    this.typeFilterSelect = page.locator('button[role="combobox"]').filter({ hasText: /all types|event|supplies|marketing|operational|other/i });
    this.totalExpensesCard = page.locator('text=/Total Expenses/i').first();
    
    // Modal
    this.expenseModal = page.getByRole('dialog');
    this.expenseTypeSelect = page.getByRole('dialog').getByRole('combobox').first();
    this.amountInput = page.getByPlaceholder('0.00');
    this.dateInput = page.locator('input[type="date"]');
    this.descriptionInput = page.getByPlaceholder('What was this expense for?');
    this.eventSelect = page.getByRole('dialog').locator('button').filter({ hasText: /select event/i });
    this.notesInput = page.getByPlaceholder('Additional details...');
    this.addExpenseSubmitButton = page.getByRole('dialog').getByRole('button', { name: /add expense|update/i });
    this.cancelButton = page.getByRole('dialog').getByRole('button', { name: /cancel/i });
    
    // Delete dialog
    this.deleteDialog = page.getByRole('alertdialog');
    this.confirmDeleteButton = page.getByRole('button', { name: /delete/i }).last();
    this.cancelDeleteButton = page.getByRole('button', { name: /cancel/i });
  }

  async goto() {
    await this.navigate('/expenses');
  }

  async isExpensesPageVisible(): Promise<boolean> {
    return await this.isVisible(this.pageHeading);
  }

  async clickAddExpense() {
    await this.clickElement(this.addExpenseButton);
  }

  async selectExpenseType(type: 'event' | 'supplies' | 'marketing' | 'operational' | 'other') {
    await this.expenseTypeSelect.click();
    await this.page.getByLabel(type, { exact: true }).click();
  }

  async fillAmount(amount: string) {
    await this.fillInput(this.amountInput, amount);
  }

  async fillDate(date: string) {
    await this.dateInput.fill(date);
  }

  async fillDescription(description: string) {
    await this.fillInput(this.descriptionInput, description);
  }

  async selectEvent(eventName: string) {
    await this.eventSelect.click();
    await this.page.getByLabel(eventName).click();
  }

  async fillNotes(notes: string) {
    await this.fillInput(this.notesInput, notes);
  }

  async submitExpense() {
    await this.addExpenseSubmitButton.click();
  }

  async cancelExpenseForm() {
    await this.cancelButton.click();
  }

  async addExpense(data: {
    type: 'event' | 'supplies' | 'marketing' | 'operational' | 'other';
    amount: string;
    date: string;
    description: string;
    eventName?: string;
    notes?: string;
  }) {
    await this.clickAddExpense();
    await this.page.waitForTimeout(300);
    
    await this.selectExpenseType(data.type);
    await this.fillAmount(data.amount);
    await this.fillDate(data.date);
    await this.fillDescription(data.description);
    
    if (data.type === 'event' && data.eventName) {
      await this.selectEvent(data.eventName);
    }
    
    if (data.notes) {
      await this.fillNotes(data.notes);
    }
    
    await this.submitExpense();
  }

  async isExpenseVisible(description: string): Promise<boolean> {
    const expense = this.page.getByText(description);
    return await this.isVisible(expense);
  }

  async deleteExpenseByDescription(description: string) {
    // Find the expense card with the description and click its delete button
    const expenseCard = this.page.locator('.p-4').filter({ hasText: description });
    const deleteButton = expenseCard.getByRole('button').filter({ has: this.page.locator('svg.lucide-trash-2') });
    await deleteButton.click();
  }

  async confirmDelete() {
    await this.confirmDeleteButton.click();
  }

  async clickDateRangePicker() {
    await this.dateRangePicker.click();
  }

  async filterByType(type: string) {
    await this.typeFilterSelect.click();
    await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click();
  }

  async getExpenseCount(): Promise<number> {
    const expenses = this.page.locator('[class*="Card"]').filter({ has: this.page.locator('text=/R \\d/') });
    return await expenses.count();
  }
}
