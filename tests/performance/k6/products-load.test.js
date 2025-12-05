import { check, sleep } from 'k6';
import http from 'k6/http';
import { supabaseRequest } from './utils/supabaseClient.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      exec: 'getProducts',
      tags: { scenario: 'smoke' },
    },
    baseline: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 5 },
        { duration: '3m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      exec: 'getProducts',
      tags: { scenario: 'baseline' },
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      exec: 'getProducts',
      tags: { scenario: 'stress' },
      startTime: '6m', // Run after baseline
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:products}': ['p(95)<600'],
  },
};

export function getProducts() {
  const res = supabaseRequest('GET', '/functions/v1/products', null, {
    tags: { endpoint: 'products' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has products array': (r) => {
      try {
        const data = r.json();
        return data && Array.isArray(data.products);
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has stock info': (r) => {
      try {
        const data = r.json();
        return data.products?.length > 0 ? data.products[0].total_stock !== undefined : true;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
