import { Page } from '@playwright/test';
import { AuthPage } from './AuthPage';
import { DashboardPage } from './DashboardPage';
import { OrdersPage } from './OrdersPage';
import { InventoryPage } from './InventoryPage';
import { CustomersPage } from './CustomersPage';
import { ReportsPage } from './ReportsPage';
import { NewSalePage } from './NewSalePage';
import { ExpensesPage } from './ExpensesPage';
import { AdminPage } from './AdminPage';
import { InvoicesPage } from './InvoicesPage';
import { SettingsPage } from './SettingsPage';

export class PageManager {
  private page: Page;
  public authPage: AuthPage;
  public dashboardPage: DashboardPage;
  public ordersPage: OrdersPage;
  public inventoryPage: InventoryPage;
  public customersPage: CustomersPage;
  public reportsPage: ReportsPage;
  public newSalePage: NewSalePage;
  public expensesPage: ExpensesPage;
  public adminPage: AdminPage;
  public invoicesPage: InvoicesPage;
  public settingsPage: SettingsPage;

  constructor(page: Page) {
    this.page = page;
    this.authPage = new AuthPage(page);
    this.dashboardPage = new DashboardPage(page);
    this.ordersPage = new OrdersPage(page);
    this.inventoryPage = new InventoryPage(page);
    this.customersPage = new CustomersPage(page);
    this.reportsPage = new ReportsPage(page);
    this.newSalePage = new NewSalePage(page);
    this.expensesPage = new ExpensesPage(page);
    this.adminPage = new AdminPage(page);
    this.invoicesPage = new InvoicesPage(page);
    this.settingsPage = new SettingsPage(page);
  }

  getPage(): Page {
    return this.page;
  }
}
