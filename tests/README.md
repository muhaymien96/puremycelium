# Revono E2E Testing

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
- `payment-link.spec.ts` - Payment link UI and flow tests (authenticated via storage state)

### Test Fixtures
Located in `tests/fixtures/fixtures.ts`:
- `pageManager` - Provides access to all page objects (for auth tests)
- `authenticatedPageManager` - Provides page objects with authenticated session (for app tests).

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

### Code Coverage (Frontend)
```bash
# Run E2E tests with coverage
npm run test:e2e:coverage

# View coverage report
npm run test:e2e:coverage:report
```

Coverage report will be generated in `coverage/` directory with:
- Line coverage - which lines of code were executed
- Branch coverage - which code branches (if/else) were taken
- Function coverage - which functions were called
- Statement coverage - which statements were executed

**Note:** Coverage only tracks frontend code (`src/`), not Edge Functions.

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

## API Tests (Playwright Request API)

Located in `tests/api/`, these tests directly validate Supabase Edge Functions without a browser.

### API Test Files
- `products.api.spec.ts` - Products endpoint (GET, POST validations)
- `orders.api.spec.ts` - Orders endpoint (POST validations, error cases)
- `checkout.api.spec.ts` - Payment processing (CASH, Yoco, refunds, error cases)
- `fixtures/api-fixtures.ts` - Shared API request context with auth
- `COVERAGE.md` - Test coverage matrix tracking all Edge Functions

### Running API Tests
```bash
npm run test:api
```

### Required Environment Variables
```env
PLAYWRIGHT_API_BASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
PLAYWRIGHT_DEFAULT_PRODUCT_ID=valid-product-uuid
PLAYWRIGHT_DEFAULT_CUSTOMER_ID=valid-customer-uuid
TEST_CARD_NUMBER=4111111111111111
TEST_CARD_EXPIRY=12/34
TEST_CARD_CVC=123
```

### Coverage Tracking
See `tests/api/COVERAGE.md` for:
- Detailed coverage matrix for all Edge Functions
- Test case inventory (validated scenarios)
- Coverage percentage by endpoint category
- Roadmap for additional test cases

## Performance Tests (k6)

Located in `tests/performance/k6/`, these load tests measure API response times and throughput.

### k6 Test Files
- `products-load.test.js` - Load test for products endpoint (GET) with smoke, baseline, and stress scenarios
- `orders-load.test.js` - Load test for orders creation (POST) and full checkout flow (order + payment)
- `invoices-load.test.js` - Load test for invoices endpoint with filtering and pagination
- `product-batches-load.test.js` - Load test for batch creation and updates
- `utils/supabaseClient.js` - Shared k6 Supabase client

### Test Scenarios

Each test file includes multiple scenarios:

| Scenario | Description | VUs | Duration |
|----------|-------------|-----|----------|
| smoke | Basic sanity check | 1 | 1m |
| baseline | Normal load pattern | 5-10 | 5m |
| stress | High load to find limits | 20-50 | 10m |
| checkout_flow | Order + Payment combined | 2 | 3m |

### Running Performance Tests
```bash
npm run perf:k6:products   # Products endpoint only
npm run perf:k6:orders     # Orders + checkout flow
npm run perf:k6:invoices   # Invoices endpoint
npm run perf:k6:batches    # Product batches
npm run perf:k6            # All performance tests
npm run perf:k6:smoke      # Quick smoke tests only
```

### Thresholds

| Endpoint | p(95) | p(99) | Error Rate |
|----------|-------|-------|------------|
| Products | <600ms | <1500ms | <1% |
| Orders | <800ms | <2000ms | <2% |
| Order-Pay | <1200ms | <2000ms | <2% |
| Invoices | <600ms | <1500ms | <1% |
| Batches | <800ms | <2000ms | <2% |

### Required Environment Variables
```env
K6_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
K6_DEFAULT_PRODUCT_ID=valid-product-uuid
K6_DEFAULT_CUSTOMER_ID=valid-customer-uuid
```

### k6 Installation
**Windows:**
```powershell
winget install grafana.k6
# or
choco install k6
```

**Linux/Mac:**
```bash
brew install k6
```

## Helper Script (Windows)

For easy test execution with automatic env loading:

```powershell
.\run-tests.ps1
```

This script:
1. Loads variables from `.env.tests`
2. Presents a menu to run specific test types
3. Shows clear success/failure status

## CI/CD Integration

### Main Pipeline (`.github/workflows/test-deploy.yml`)
Runs on every push to `test` branch:
- E2E tests (Playwright UI)
- **API tests** (Playwright Request) ⚠️ NEW
- Build and deploy to Netlify

### Performance Pipeline (`.github/workflows/performance.yml`)
Runs separately (on-demand or nightly):
- k6 load tests for products and orders
- Triggered manually or on schedule
- Can choose smoke/baseline/all test levels

### Required GitHub Secrets
**Existing:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_TEST_SITE_ID`

**New (for API/Performance):**
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for API tests
- `TEST_PRODUCT_ID` - Valid product UUID for order tests
- `TEST_CUSTOMER_ID` - Valid customer UUID for order tests

## Reports
- **E2E/API:** Playwright HTML report at `playwright-report/`
- **Allure:** Allure results in `allure-results/`, HTML report in `allure-report/`
- **k6:** Console output with summary (p95 latency, error rate, throughput)
- **Screenshots:** Captured on test failure
- **Videos:** Captured on test failure (retention-on-failure)
