# API Test Coverage Matrix

This document tracks test coverage for all Supabase Edge Functions.

## Coverage Summary

| Category | Endpoints Tested | Total Endpoints | Coverage |
|----------|------------------|-----------------|----------|
| Products | 2/2 | 2 | 100% |
| Orders | 1/1 | 1 | 100% |
| Payments | 7/7 | 7 | 100% |
| Refunds | 0/1 | 1 | 0% |
| Batches | 0/1 | 1 | 0% |
| Invoices | 0/3 | 3 | 0% |
| **Total** | **10/15** | **15** | **67%** |

---

## Detailed Coverage

### ✅ Products API (`/functions/v1/products`)

| Method | Endpoint | Test Case | Status | File |
|--------|----------|-----------|--------|------|
| GET | /products | Returns products array with stock info | ✅ | products.api.spec.ts |
| POST | /products | Creates product with valid payload | ✅ | products.api.spec.ts |
| POST | /products | Fails with missing required fields (400) | ✅ | products.api.spec.ts |

**Coverage:** 100% (3/3 test cases)

---

### ✅ Orders API (`/functions/v1/orders`)

| Method | Endpoint | Test Case | Status | File |
|--------|----------|-----------|--------|------|
| POST | /orders | Creates order with valid payload | ✅ | orders.api.spec.ts |
| POST | /orders | Fails with empty items array (400) | ✅ | orders.api.spec.ts |
| POST | /orders | Fails with invalid item structure (400) | ✅ | orders.api.spec.ts |

**Coverage:** 100% (3/3 test cases)

---

### ✅ Checkout/Payment API (`/functions/v1/order-pay`)

| Method | Endpoint | Test Case | Status | File |
|--------|----------|-----------|--------|------|
| POST | /order-pay | Processes CASH payment successfully | ✅ | checkout.api.spec.ts |
| POST | /order-pay | Processes manual terminal confirmation | ✅ | checkout.api.spec.ts |
| POST | /order-pay | Creates Yoco checkout (YOKO_WEBPOS) | ✅ | checkout.api.spec.ts |
| POST | /order-pay | Creates payment link (PAYMENT_LINK) | ✅ | checkout.api.spec.ts |
| POST | /order-pay | Fails with missing required fields (400) | ✅ | checkout.api.spec.ts |
| POST | /order-pay | Fails with non-existent order (404) | ✅ | checkout.api.spec.ts |
| POST | /order-pay | Fails with invalid payment method (400) | ✅ | checkout.api.spec.ts |

**Coverage:** 100% (7/7 test cases)

**Payment Methods Covered:**
- ✅ CASH (immediate completion)
- ✅ YOKO_WEBPOS with manual confirmation
- ✅ YOKO_WEBPOS with Yoco checkout
- ✅ PAYMENT_LINK

---

### ❌ Refunds API (`/functions/v1/order-refund`)

| Method | Endpoint | Test Case | Status | File |
|--------|----------|-----------|--------|------|
| POST | /order-refund | Processes full refund | ❌ Not implemented | - |
| POST | /order-refund | Processes partial refund | ❌ Not implemented | - |
| POST | /order-refund | Fails with missing fields (400) | ❌ Not implemented | - |
| POST | /order-refund | Fails with invalid order (404) | ❌ Not implemented | - |

**Coverage:** 0% (0/4 test cases)

---

### ❌ Product Batches API (`/functions/v1/product-batches`)

| Method | Endpoint | Test Case | Status | File |
|--------|----------|-----------|--------|------|
| POST | /product-batches | Creates batch with valid payload | ❌ Not implemented | - |
| POST | /product-batches | Fails with missing fields (400) | ❌ Not implemented | - |
| POST | /product-batches | Fails with invalid product (404) | ❌ Not implemented | - |

**Coverage:** 0% (0/3 test cases)

---

### ❌ Invoices API (`/functions/v1/invoices`)

| Method | Endpoint | Test Case | Status | File |
|--------|----------|-----------|--------|------|
| GET | /invoices | Lists invoices | ❌ Not implemented | - |
| POST | /generate-invoice-pdf | Generates PDF for invoice | ❌ Not implemented | - |
| POST | /send-invoice | Sends invoice via email | ❌ Not implemented | - |
| POST | /send-payment-link | Sends payment link | ❌ Not implemented | - |

**Coverage:** 0% (0/4 test cases)

---

### ⚠️ Webhooks (`/functions/v1/yoco-webhook`)

| Method | Endpoint | Test Case | Status | File |
|--------|----------|-----------|--------|------|
| POST | /yoco-webhook | Handles payment success webhook | ⚠️ Excluded | - |
| POST | /yoco-webhook | Handles payment failure webhook | ⚠️ Excluded | - |

**Note:** Webhook testing typically requires mocking external services or using webhook testing tools. Consider integration tests or manual testing for webhooks.

---

## Test Execution

Run all API tests:
```bash
npm run test:api
```

Run specific test file:
```bash
npx playwright test tests/api/checkout.api.spec.ts --config=playwright.api.config.ts
```

---

## Coverage Goals

### Short Term (Current Sprint)
- ✅ Products API (100%)
- ✅ Orders API (100%)
- ✅ Payments API (100%)

### Medium Term (Next Sprint)
- ❌ Refunds API (target: 100%)
- ❌ Product Batches API (target: 100%)

### Long Term (Future)
- ❌ Invoices API (target: 80%)
- ⚠️ Webhooks (manual/integration testing)

---

## Notes

- **Authentication:** All tests use real user JWT tokens (not service role keys) to match production behavior
- **Test Data:** Tests create and clean up their own test data using realistic payloads
- **Error Cases:** Each endpoint tests both happy paths and common error scenarios
- **Yoco Integration:** Tests gracefully skip if Yoco API key is not configured in test environment

**Last Updated:** 2025-11-28
