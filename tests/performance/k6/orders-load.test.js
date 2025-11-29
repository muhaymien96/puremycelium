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
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.02'],
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
  });

  sleep(1);
}
