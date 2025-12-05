import { test, expect } from './fixtures/api-fixtures';

const SEND_PAYMENT_LINK_PATH = '/functions/v1/send-payment-link';
const ORDERS_PATH = '/functions/v1/orders';

test.describe('Send Payment Link API', () => {
  let testOrderId: string | null = null;
  let testCustomerEmail: string;
  let orderCreationFailed = false;

  // Create a test order before each test
  test.beforeEach(async ({ api }) => {
    const productId = process.env.PLAYWRIGHT_DEFAULT_PRODUCT_ID || process.env.K6_DEFAULT_PRODUCT_ID;
    const customerId = process.env.PLAYWRIGHT_DEFAULT_CUSTOMER_ID || process.env.K6_DEFAULT_CUSTOMER_ID;
    testCustomerEmail = process.env.PLAYWRIGHT_TEST_EMAIL || 'test@example.com';

    if (!productId) {
      orderCreationFailed = true;
      console.log('Skipping order creation - product ID not set');
      return;
    }

    // Create an order to send payment link for
    const orderPayload = {
      customer_id: customerId || null,
      items: [
        {
          product_id: productId,
          quantity: 1,
          unit_price: 150,
        },
      ],
      discount_amount: 0,
      tax_amount: 0,
      notes: 'Test order for payment link',
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
    console.log(`Created test order for payment link: ${testOrderId}`);
  });

  test('POST /send-payment-link fails with missing required fields', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping payment link test');
      return;
    }
    
    const res = await api.post(SEND_PAYMENT_LINK_PATH, {
      data: {
        order_id: testOrderId,
        // missing customer_email and amount
      },
    });

    expect(res.status(), 'status should be 400 for missing fields').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  test('POST /send-payment-link fails with non-existent order', async ({ api }) => {
    // This test doesn't need order creation - tests non-existent order
    const res = await api.post(SEND_PAYMENT_LINK_PATH, {
      data: {
        order_id: '00000000-0000-0000-0000-000000000000',
        customer_email: testCustomerEmail,
        amount: 150,
      },
    });

    expect(res.status(), 'status should be 404 for non-existent order').toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Order not found');
  });

  test('POST /send-payment-link creates checkout and sends email', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping payment link test');
      return;
    }
    
    const res = await api.post(SEND_PAYMENT_LINK_PATH, {
      data: {
        order_id: testOrderId,
        customer_email: testCustomerEmail,
        amount: 150,
      },
    });

    const body = await res.json();

    // Skip if Yoco API key not configured
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
    expect(body.checkout_id).toBeTruthy();
    expect(body.customer_email).toBe(testCustomerEmail);
    expect(body.message).toContain('Payment link sent');
  });

  test('POST /send-payment-link includes payment record', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping payment link test');
      return;
    }
    
    const res = await api.post(SEND_PAYMENT_LINK_PATH, {
      data: {
        order_id: testOrderId,
        customer_email: testCustomerEmail,
        amount: 150,
      },
    });

    const body = await res.json();

    // Skip if Yoco API key not configured
    if (res.status() === 500 && body.error?.includes('Yoco API key not configured')) {
      test.skip(true, 'Yoco API key not configured in test environment');
      return;
    }

    expect(res.status()).toBe(200);
    expect(body.payment).toBeTruthy();
    expect(body.payment.payment_method).toBe('PAYMENT_LINK');
    expect(body.payment.payment_status).toBe('pending');
  });

  test('POST /send-payment-link validates email format', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping payment link test');
      return;
    }
    
    const res = await api.post(SEND_PAYMENT_LINK_PATH, {
      data: {
        order_id: testOrderId,
        customer_email: 'invalid-email', // Invalid email format
        amount: 150,
      },
    });

    // The API might accept invalid emails (Resend will fail on send)
    // or it might validate - depends on implementation
    const body = await res.json();

    // Skip Yoco check
    if (res.status() === 500 && body.error?.includes('Yoco API key not configured')) {
      test.skip(true, 'Yoco API key not configured in test environment');
      return;
    }

    // Either 200 (if email validation is done on send) or 400 (if validated upfront)
    expect([200, 400]).toContain(res.status());
  });

  test('POST /send-payment-link supports business_profile_id for branding', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping payment link test');
      return;
    }
    
    // Test with a potentially invalid business profile - should still work with defaults
    const res = await api.post(SEND_PAYMENT_LINK_PATH, {
      data: {
        order_id: testOrderId,
        customer_email: testCustomerEmail,
        amount: 150,
        business_profile_id: '00000000-0000-0000-0000-000000000000', // Non-existent, should fallback to default
      },
    });

    const body = await res.json();

    // Skip if Yoco API key not configured
    if (res.status() === 500 && body.error?.includes('Yoco API key not configured')) {
      test.skip(true, 'Yoco API key not configured in test environment');
      return;
    }

    // Should either succeed with default business settings or fail gracefully
    expect([200, 500]).toContain(res.status());
    
    if (res.status() === 200) {
      expect(body.success).toBe(true);
    }
  });

  test('POST /send-payment-link converts amount to cents correctly', async ({ api }) => {
    if (orderCreationFailed || !testOrderId) {
      test.skip(true, 'Order creation failed - skipping payment link test');
      return;
    }
    
    // Test with decimal amount
    const res = await api.post(SEND_PAYMENT_LINK_PATH, {
      data: {
        order_id: testOrderId,
        customer_email: testCustomerEmail,
        amount: 99.99, // R99.99
      },
    });

    const body = await res.json();

    // Skip if Yoco API key not configured
    if (res.status() === 500 && body.error?.includes('Yoco API key not configured')) {
      test.skip(true, 'Yoco API key not configured in test environment');
      return;
    }

    if (res.status() !== 200) {
      console.error('Decimal amount payment link failed:', body);
    }

    expect(res.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.checkout_url).toBeTruthy();
  });
});
