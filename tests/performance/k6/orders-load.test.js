import { check, sleep } from 'k6';
import { supabaseRequest } from './utils/supabaseClient.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      exec: 'createOrder',
      tags: { scenario: 'smoke' },
    },
    baseline: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 3 },
        { duration: '3m', target: 8 },
        { duration: '1m', target: 0 },
      ],
      exec: 'createOrder',
      tags: { scenario: 'baseline' },
    },
    checkout_flow: {
      executor: 'constant-vus',
      vus: 2,
      duration: '3m',
      exec: 'createOrderAndPay',
      tags: { scenario: 'checkout' },
      startTime: '6m', // Run after baseline
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 3,
      stages: [
        { duration: '2m', target: 15 },
        { duration: '3m', target: 25 },
        { duration: '1m', target: 0 },
      ],
      exec: 'createOrder',
      tags: { scenario: 'stress' },
      startTime: '10m', // Run after checkout_flow
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
    'http_req_duration{endpoint:orders}': ['p(95)<800'],
    'http_req_duration{endpoint:order-pay}': ['p(95)<1200'],
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createOrder() {
  // NOTE: Adjust product_id / customer_id / market_event_id to valid test IDs
  const productId = __ENV.K6_DEFAULT_PRODUCT_ID;
  const customerId = __ENV.K6_DEFAULT_CUSTOMER_ID || null;

  const qty = randomInt(1, 3);
  const unitPrice = 100;

  const payload = {
    customer_id: customerId,
    items: [
      {
        product_id: productId,
        quantity: qty,
        unit_price: unitPrice,
      },
    ],
    discount_amount: 0,
    tax_amount: 0,
    notes: 'k6 load test order',
  };

  const res = supabaseRequest('POST', '/functions/v1/orders', payload, {
    tags: { endpoint: 'orders' },
  });

  check(res, {
    'status is 201 or 207': (r) => r.status === 201 || r.status === 207,
    'has order object': (r) => {
      try {
        const data = r.json();
        return data && data.order && data.order.id;
      } catch {
        return false;
      }
    },
    'response time < 800ms': (r) => r.timings.duration < 800,
  });

  sleep(1);
  return res;
}

export function createOrderAndPay() {
  const productId = __ENV.K6_DEFAULT_PRODUCT_ID;
  const customerId = __ENV.K6_DEFAULT_CUSTOMER_ID || null;

  const qty = randomInt(1, 2);
  const unitPrice = 100;
  const totalAmount = qty * unitPrice;

  // Create order
  const orderPayload = {
    customer_id: customerId,
    items: [
      {
        product_id: productId,
        quantity: qty,
        unit_price: unitPrice,
      },
    ],
    discount_amount: 0,
    tax_amount: 0,
    notes: 'k6 checkout flow test',
  };

  const orderRes = supabaseRequest('POST', '/functions/v1/orders', orderPayload, {
    tags: { endpoint: 'orders' },
  });

  const orderSuccess = check(orderRes, {
    'order created': (r) => r.status === 201 || r.status === 207,
  });

  if (!orderSuccess) {
    sleep(1);
    return;
  }

  let orderId;
  try {
    const orderData = orderRes.json();
    orderId = orderData.order.id;
  } catch {
    sleep(1);
    return;
  }

  // Pay with CASH (instant completion)
  const payPayload = {
    order_id: orderId,
    payment_method: 'CASH',
    amount: totalAmount,
    metadata: { notes: 'k6 load test payment' },
  };

  const payRes = supabaseRequest('POST', '/functions/v1/order-pay', payPayload, {
    tags: { endpoint: 'order-pay' },
  });

  check(payRes, {
    'payment successful': (r) => r.status === 200,
    'payment completed': (r) => {
      try {
        const data = r.json();
        return data && data.payment && data.payment.payment_status === 'completed';
      } catch {
        return false;
      }
    },
    'invoice generated': (r) => {
      try {
        const data = r.json();
        return data && data.invoice && data.invoice.status === 'paid';
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
