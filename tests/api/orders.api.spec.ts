import { test, expect } from './fixtures/api-fixtures';

const ORDERS_PATH = '/functions/v1/orders';

// Basic contract + behavior tests for orders edge function

test.describe('Orders API', () => {
  test('POST /orders fails with empty items array', async ({ api }) => {
    const res = await api.post(ORDERS_PATH, {
      data: {
        customer_id: null,
        market_event_id: null,
        items: [],
      },
    });

    expect(res.status(), 'status should be 400 for empty items').toBe(400);
  });

  test('POST /orders fails with invalid item structure', async ({ api }) => {
    const res = await api.post(ORDERS_PATH, {
      data: {
        items: [{ quantity: 1 }], // missing product_id and unit_price
      },
    });

    expect(res.status(), 'status should be 400 for invalid items').toBe(400);
  });

  test('POST /orders creates an order with minimal valid payload', async ({ api }) => {
    const productId = process.env.PLAYWRIGHT_DEFAULT_PRODUCT_ID || process.env.K6_DEFAULT_PRODUCT_ID;

    if (!productId) {
      test.skip(true, 'PLAYWRIGHT_DEFAULT_PRODUCT_ID or K6_DEFAULT_PRODUCT_ID must be set for this test');
    }

    const payload = {
      customer_id: process.env.PLAYWRIGHT_DEFAULT_CUSTOMER_ID || null,
      items: [
        {
          product_id: productId,
          quantity: 1,
          unit_price: 100,
        },
      ],
      discount_amount: 0,
      tax_amount: 0,
      notes: 'Playwright API test order',
    };

    const res = await api.post(ORDERS_PATH, { data: payload });

    expect([201, 207]).toContain(res.status());

    const body = await res.json();
    expect(body.order).toBeTruthy();
    expect(body.order.total_amount).toBeGreaterThan(0);
  });
});
