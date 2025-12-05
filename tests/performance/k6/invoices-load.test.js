import { check, sleep } from 'k6';
import { supabaseRequest } from './utils/supabaseClient.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      exec: 'getInvoices',
      tags: { scenario: 'smoke' },
    },
    list_baseline: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 5 },
        { duration: '3m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      exec: 'getInvoices',
      tags: { scenario: 'list_baseline' },
    },
    filtered_queries: {
      executor: 'constant-vus',
      vus: 3,
      duration: '3m',
      exec: 'getFilteredInvoices',
      tags: { scenario: 'filtered' },
      startTime: '6m',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 15 },
        { duration: '3m', target: 25 },
        { duration: '1m', target: 0 },
      ],
      exec: 'getInvoices',
      tags: { scenario: 'stress' },
      startTime: '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:invoices}': ['p(95)<600'],
    'http_req_duration{endpoint:invoices-filtered}': ['p(95)<700'],
  },
};

export function getInvoices() {
  const res = supabaseRequest('GET', '/functions/v1/invoices?limit=50', null, {
    tags: { endpoint: 'invoices' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has data array': (r) => {
      try {
        const data = r.json();
        return data && Array.isArray(data.data);
      } catch {
        return false;
      }
    },
    'has count': (r) => {
      try {
        const data = r.json();
        return data && typeof data.count === 'number';
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

export function getFilteredInvoices() {
  // Randomly select filter type
  const filterTypes = ['status', 'delivery_status', 'date_range', 'pagination'];
  const filterType = filterTypes[Math.floor(Math.random() * filterTypes.length)];

  let endpoint = '/functions/v1/invoices?';

  switch (filterType) {
    case 'status':
      const statuses = ['paid', 'unpaid', 'overdue'];
      endpoint += `status=${statuses[Math.floor(Math.random() * statuses.length)]}`;
      break;
    case 'delivery_status':
      const deliveryStatuses = ['sent', 'pending', 'failed'];
      endpoint += `delivery_status=${deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)]}`;
      break;
    case 'date_range':
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      endpoint += `start_date=${startDate}&end_date=${endDate}`;
      break;
    case 'pagination':
      const limit = Math.floor(Math.random() * 50) + 10;
      const offset = Math.floor(Math.random() * 100);
      endpoint += `limit=${limit}&offset=${offset}`;
      break;
  }

  const res = supabaseRequest('GET', endpoint, null, {
    tags: { endpoint: 'invoices-filtered' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has data array': (r) => {
      try {
        const data = r.json();
        return data && Array.isArray(data.data);
      } catch {
        return false;
      }
    },
    'response time < 600ms': (r) => r.timings.duration < 600,
  });

  sleep(0.5);
}

export function getSingleInvoice() {
  // First get list to find an invoice ID
  const listRes = supabaseRequest('GET', '/functions/v1/invoices?limit=1', null, {
    tags: { endpoint: 'invoices' },
  });

  if (listRes.status !== 200) {
    sleep(1);
    return;
  }

  let invoiceId;
  try {
    const data = listRes.json();
    if (data.data && data.data.length > 0) {
      invoiceId = data.data[0].id;
    }
  } catch {
    sleep(1);
    return;
  }

  if (!invoiceId) {
    sleep(1);
    return;
  }

  const res = supabaseRequest('GET', `/functions/v1/invoices/${invoiceId}`, null, {
    tags: { endpoint: 'invoice-detail' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has invoice data': (r) => {
      try {
        const data = r.json();
        return data && data.id && data.invoice_number;
      } catch {
        return false;
      }
    },
    'has related data': (r) => {
      try {
        const data = r.json();
        return data && (data.customers || data.orders);
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
