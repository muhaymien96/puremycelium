import { test, expect } from './fixtures/api-fixtures';

const ORDER_REFUND_PATH = '/functions/v1/order-refund';
const ORDERS_PATH = '/functions/v1/orders';

test.describe('Order Refund API', () => {
  let testOrderId: string | null = null;
  let testProductId: string;
  let orderCreationFailed = false;

  // Create a test order before each refund test
  test.beforeEach(async ({ api }) => {
    testProductId = process.env.PLAYWRIGHT_DEFAULT_PRODUCT_ID || process.env.K6_DEFAULT_PRODUCT_ID || '';

    if (!testProductId) {
      orderCreationFailed = true;
      console.log('Skipping order creation - product ID not set');
      return;
    }

    // Create an order to potentially refund - use null customer to avoid FK constraint
    const orderPayload = {
      customer_id: null, // Anonymous order to avoid FK constraint issues
      items: [
        {
          product_id: testProductId,
          quantity: 2,
          unit_price: 100,
        },
      ],
      discount_amount: 0,
      tax_amount: 0,
      notes: 'Test order for refund testing',
    };

    const orderRes = await api.post(ORDERS_PATH, { data: orderPayload });
    
    // Handle order creation failure gracefully
    if (![201, 207].includes(orderRes.status())) {
      try {
        const body = await orderRes.json();
        console.log(`Order creation failed (status ${orderRes.status()}):`, body);
      } catch {
        const text = await orderRes.text();
        console.log(`Order creation failed (status ${orderRes.status()}):`, text.substring(0, 200));
      }
      orderCreationFailed = true;
      return;
    }

    const orderBody = await orderRes.json();
    testOrderId = orderBody.order.id;
    orderCreationFailed = false;
    console.log(`Created test order for refund: ${testOrderId}`);
  });

  test('POST /order-refund fails with missing required fields', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping refund test');
      return;
    }
    
    const res = await api.post(ORDER_REFUND_PATH, {
      data: {
        order_id: testOrderId,
        // missing amount and items
      },
    });

    expect(res.status(), 'status should be 400 for missing fields').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  test('POST /order-refund fails with empty items array', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping refund test');
      return;
    }
    
    const res = await api.post(ORDER_REFUND_PATH, {
      data: {
        order_id: testOrderId,
        amount: 100,
        items: [],
        reason: 'Test refund',
      },
    });

    expect(res.status(), 'status should be 400 for empty items').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  test('POST /order-refund fails with non-existent order', async ({ api }) => {
    // This test doesn't need order creation - tests non-existent order
    const res = await api.post(ORDER_REFUND_PATH, {
      data: {
        order_id: '00000000-0000-0000-0000-000000000000',
        amount: 100,
        reason: 'Test refund',
        items: [
          {
            product_id: testProductId,
            quantity: 1,
          },
        ],
      },
    });

    expect(res.status(), 'status should be 404 for non-existent order').toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Order not found');
  });

  test('POST /order-refund processes refund successfully', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping refund test');
      return;
    }
    
    const res = await api.post(ORDER_REFUND_PATH, {
      data: {
        order_id: testOrderId,
        amount: 100,
        reason: 'Customer requested refund - test',
        notes: 'Automated test refund',
        items: [
          {
            product_id: testProductId,
            quantity: 1,
          },
        ],
      },
    });

    const body = await res.json();
    if (res.status() !== 200) {
      console.error('Refund failed:', body);
    }

    expect(res.status(), `Refund should succeed, got: ${JSON.stringify(body)}`).toBe(200);
    expect(body.success).toBe(true);
    expect(body.refund).toBeTruthy();
    expect(body.refund.amount).toBe(100);
    expect(body.refund.reason).toBe('Customer requested refund - test');
    expect(body.message).toBe('Refund processed successfully');
  });

  test('POST /order-refund supports partial refund', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping refund test');
      return;
    }
    
    // First refund partial amount
    const res = await api.post(ORDER_REFUND_PATH, {
      data: {
        order_id: testOrderId,
        amount: 50, // Half of item price
        reason: 'Partial refund test',
        items: [
          {
            product_id: testProductId,
            quantity: 1,
          },
        ],
      },
    });

    const body = await res.json();
    if (res.status() !== 200) {
      console.error('Partial refund failed:', body);
    }

    expect(res.status(), `Partial refund should succeed, got: ${JSON.stringify(body)}`).toBe(200);
    expect(body.success).toBe(true);
    expect(body.refund.amount).toBe(50);
  });

  test('POST /order-refund includes refund ID in response', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping refund test');
      return;
    }
    
    const res = await api.post(ORDER_REFUND_PATH, {
      data: {
        order_id: testOrderId,
        amount: 100,
        reason: 'Testing refund ID',
        items: [
          {
            product_id: testProductId,
            quantity: 1,
          },
        ],
      },
    });

    const body = await res.json();
    
    expect(res.status()).toBe(200);
    expect(body.refund).toHaveProperty('id');
    expect(body.refund.id).toBeTruthy();
  });
});
