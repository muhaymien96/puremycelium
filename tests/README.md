# PureMycelium E2E Testing

## Architecture Overview

### Authentication Strategy
Tests use a **global setup** approach for optimal performance:
- **Global Setup** (`tests/global-setup.ts`): Runs once before all tests to authenticate and save session state
- **Storage State** (`storage/auth.json`): Contains the authenticated session (cookies, localStorage, etc.)
- **Auth Tests**: Run without storage state to test the actual login flow
- **App Tests**: Use the saved storage state to skip login and run authenticated immediately

### Page Object Model (POM)
All page objects are located in `tests/pages/`:
- `BasePage.ts` - Base class with common methods
- `AuthPage.ts` - Authentication page
- `DashboardPage.ts` - Dashboard navigation
- `OrdersPage.ts` - Order management
- `InventoryPage.ts` - Inventory management
- `CustomersPage.ts` - Customer management
- `ReportsPage.ts` - Reports and analytics
- `NewSalePage.ts` - POS/New Sale page
- `index.ts` - PageManager for centralized access

### E2E Tests
Playwright tests in `tests/e2e/`:
- `auth.spec.ts` - Authentication tests (no storage state, tests actual login)
- `dashboard.spec.ts` - Dashboard navigation (authenticated via storage state)
- `orders.spec.ts` - Order management (authenticated via storage state)
- `inventory.spec.ts` - Inventory operations (authenticated via storage state)
- `customers.spec.ts` - Customer management (authenticated via storage state)
- `reports.spec.ts` - Reports viewing (authenticated via storage state)
- `new-sale.spec.ts` - POS operations (authenticated via storage state)

### Test Fixtures
Located in `tests/fixtures/fixtures.ts`:
- `pageManager` - Provides access to all page objects (for auth tests)
- `authenticatedPageManager` - Provides page objects with authenticated session (for app tests)

## Test Execution Flow

1. **Global Setup** runs first (once):
   - Authenticates with test credentials
   - Saves session to `storage/auth.json`
   
2. **Auth Tests** run:
   - Use `pageManager` fixture (no pre-authentication)
   - Test the actual login/signup UI flows
   - Run on separate projects: `auth-chromium`, `auth-firefox`, `auth-webkit`
   
3. **App Tests** run in parallel:
   - Use `authenticatedPageManager` fixture
   - Load `storage/auth.json` for instant authentication
   - No login UI automation needed
   - Run on projects: `chromium`, `firefox`, `webkit`, `Mobile Chrome`, `Mobile Safari`

## Running Tests

### Playwright Tests
```bash
# Run all tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed

# View HTML report
npm run test:e2e:report
```

### Allure Reports
```bash
# Generate Allure report
npm run test:allure

# Open Allure report
npm run test:allure:open

# Generate and serve report
npm run test:allure:serve
```

## Environment Variables
Required for tests:
- `TEST_USER_EMAIL` - Test user email (defaults to 'test@example.com' if not set)
- `TEST_USER_PASSWORD` - Test user password (defaults to 'testpassword123' if not set)
- `PLAYWRIGHT_TEST_BASE_URL` - Base URL (default: http://localhost:8080)

**Note**: Set these environment variables before running tests for proper authentication.

Example (PowerShell):
```powershell
$env:TEST_USER_EMAIL="your-test-email@example.com"
$env:TEST_USER_PASSWORD="your-password"
npm run test:e2e
```

Example (.env file approach):
Create a `.env` file in the root directory:
```
TEST_USER_EMAIL=your-test-email@example.com
TEST_USER_PASSWORD=your-password
```

## Reports
- Playwright HTML report: `playwright-report/`
- Allure results: `allure-results/`
- Allure HTML report: `allure-report/`
- Screenshots: Captured on test failure
- Videos: Captured on test failure (retention-on-failure)
