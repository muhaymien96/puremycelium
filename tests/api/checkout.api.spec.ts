import { test, expect } from './fixtures/api-fixtures';

const ORDER_PAY_PATH = '/functions/v1/order-pay';
const ORDERS_PATH = '/functions/v1/orders';

test.describe('Checkout/Payment API', () => {
  let testOrderId: string;

  // Create a test order before each payment test
  test.beforeEach(async ({ api }) => {
    const productId = process.env.PLAYWRIGHT_DEFAULT_PRODUCT_ID || process.env.K6_DEFAULT_PRODUCT_ID;
    const customerId = process.env.PLAYWRIGHT_DEFAULT_CUSTOMER_ID || process.env.K6_DEFAULT_CUSTOMER_ID;

    if (!productId) {
      throw new Error('PLAYWRIGHT_DEFAULT_PRODUCT_ID or K6_DEFAULT_PRODUCT_ID must be set');
    }

    // Create an order to pay for
    const orderPayload = {
      customer_id: customerId || null,
      items: [
        {
          product_id: productId,
          quantity: 1,
          unit_price: 100,
        },
      ],
      discount_amount: 0,
      tax_amount: 0,
      notes: 'Test order for checkout',
    };

    const orderRes = await api.post(ORDERS_PATH, { data: orderPayload });
    expect([201, 207]).toContain(orderRes.status());

    const orderBody = await orderRes.json();
    testOrderId = orderBody.order.id;
    console.log(`Created test order: ${testOrderId}`);
  });

  test('POST /order-pay fails with missing required fields', async ({ api }) => {
    const res = await api.post(ORDER_PAY_PATH, {
      data: {
        order_id: testOrderId,
        // missing payment_method and amount
      },
    });

    expect(res.status(), 'status should be 400 for missing fields').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  test('POST /order-pay fails with non-existent order', async ({ api }) => {
    const res = await api.post(ORDER_PAY_PATH, {
      data: {
        order_id: '00000000-0000-0000-0000-000000000000',
        payment_method: 'CASH',
        amount: 100,
      },
    });

    expect(res.status(), 'status should be 404 for non-existent order').toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Order not found');
  });

  test('POST /order-pay processes CASH payment successfully', async ({ api }) => {
    const res = await api.post(ORDER_PAY_PATH, {
      data: {
        order_id: testOrderId,
        payment_method: 'CASH',
        amount: 100,
        metadata: {
          notes: 'Test cash payment',
        },
      },
    });

    const body = await res.json();
    if (res.status() !== 200) {
      console.error('CASH payment failed:', body);
    }

    expect(res.status(), `CASH payment should succeed, got: ${JSON.stringify(body)}`).toBe(200);
    expect(body.success).toBe(true);
    expect(body.payment).toBeTruthy();
    expect(body.payment.payment_method).toBe('CASH');
    expect(body.payment.payment_status).toBe('completed');
    expect(body.invoice).toBeTruthy();
    expect(body.invoice.status).toBe('paid');
  });

  test('POST /order-pay processes manual terminal confirmation successfully', async ({ api }) => {
    const res = await api.post(ORDER_PAY_PATH, {
      data: {
        order_id: testOrderId,
        payment_method: 'YOKO_WEBPOS',
        amount: 100,
        manual_terminal_confirmation: true,
      },
    });

    const body = await res.json();
    if (res.status() !== 200) {
      console.error('Manual terminal confirmation failed:', body);
    }

    expect(res.status(), `Terminal confirmation should succeed, got: ${JSON.stringify(body)}`).toBe(200);
    expect(body.success).toBe(true);
    expect(body.payment).toBeTruthy();
    expect(body.payment.payment_method).toBe('YOKO_WEBPOS');
    expect(body.payment.payment_status).toBe('completed');
    expect(body.payment.notes).toContain('Manual terminal confirmation');
  });

  test('POST /order-pay creates Yoco checkout for YOKO_WEBPOS', async ({ api }) => {
    const res = await api.post(ORDER_PAY_PATH, {
      data: {
        order_id: testOrderId,
        payment_method: 'YOKO_WEBPOS',
        amount: 100,
        manual_terminal_confirmation: false,
        metadata: {
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      },
    });

    const body = await res.json();
    
    // This might fail in test env if YOCO_SECRET_KEY is not set
    if (res.status() === 500 && body.error?.includes('Yoco API key not configured')) {
      test.skip(true, 'Yoco API key not configured in test environment');
      return;
    }

    if (res.status() !== 200) {
      console.error('Yoco checkout creation failed:', body);
    }

    expect(res.status(), `Yoco checkout should be created, got: ${JSON.stringify(body)}`).toBe(200);
    expect(body.success).toBe(true);
    expect(body.checkout_url).toBeTruthy();
    expect(body.checkout_id).toBeTruthy();
    expect(body.payment).toBeTruthy();
    expect(body.payment.payment_status).toBe('pending');
  });

  test('POST /order-pay creates Yoco checkout for PAYMENT_LINK', async ({ api }) => {
    const res = await api.post(ORDER_PAY_PATH, {
      data: {
        order_id: testOrderId,
        payment_method: 'PAYMENT_LINK',
        amount: 100,
      },
    });

    const body = await res.json();
    
    // This might fail in test env if YOCO_SECRET_KEY is not set
    if (res.status() === 500 && body.error?.includes('Yoco API key not configured')) {
      test.skip(true, 'Yoco API key not configured in test environment');
      return;
    }

    if (res.status() !== 200) {
      console.error('Payment link creation failed:', body);
    }

    expect(res.status(), `Payment link should be created, got: ${JSON.stringify(body)}`).toBe(200);
    expect(body.success).toBe(true);
    expect(body.checkout_url).toBeTruthy();
  });

  test('POST /order-pay fails with invalid payment method', async ({ api }) => {
    const res = await api.post(ORDER_PAY_PATH, {
      data: {
        order_id: testOrderId,
        payment_method: 'INVALID_METHOD',
        amount: 100,
      },
    });

    expect(res.status(), 'status should be 400 for invalid payment method').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid payment method');
  });
});
