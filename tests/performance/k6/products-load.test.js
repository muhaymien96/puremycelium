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
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
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
  });

  sleep(1);
}
