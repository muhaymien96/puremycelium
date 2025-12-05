import { check, sleep } from 'k6';
import { supabaseRequest } from './utils/supabaseClient.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      exec: 'createBatch',
      tags: { scenario: 'smoke' },
    },
    baseline: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 3 },
        { duration: '2m', target: 5 },
        { duration: '1m', target: 0 },
      ],
      exec: 'createBatch',
      tags: { scenario: 'baseline' },
    },
    update_flow: {
      executor: 'constant-vus',
      vus: 2,
      duration: '2m',
      exec: 'createAndUpdateBatch',
      tags: { scenario: 'update' },
      startTime: '5m',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: [
        { duration: '1m', target: 8 },
        { duration: '2m', target: 15 },
        { duration: '1m', target: 0 },
      ],
      exec: 'createBatch',
      tags: { scenario: 'stress' },
      startTime: '8m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
    'http_req_duration{endpoint:product-batches-create}': ['p(95)<800'],
    'http_req_duration{endpoint:product-batches-update}': ['p(95)<600'],
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBatchNumber() {
  return `K6-${Date.now()}-${randomInt(1000, 9999)}`;
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getFutureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

export function createBatch() {
  const productId = __ENV.K6_DEFAULT_PRODUCT_ID;

  if (!productId) {
    console.warn('K6_DEFAULT_PRODUCT_ID not set, skipping batch creation');
    sleep(1);
    return;
  }

  const payload = {
    product_id: productId,
    batch_number: generateBatchNumber(),
    quantity: randomInt(10, 100),
    production_date: getTodayDate(),
    expiry_date: getFutureDate(365), // 1 year expiry
    cost_per_unit: parseFloat((randomInt(50, 200) / 10).toFixed(2)),
    notes: 'k6 load test batch',
  };

  const res = supabaseRequest('POST', '/functions/v1/product-batches', payload, {
    tags: { endpoint: 'product-batches-create' },
  });

  check(res, {
    'batch created (201 or 207)': (r) => r.status === 201 || r.status === 207,
    'has batch object': (r) => {
      try {
        const data = r.json();
        return data && data.success && data.batch && data.batch.id;
      } catch {
        return false;
      }
    },
    'response time < 800ms': (r) => r.timings.duration < 800,
  });

  sleep(1);
  return res;
}

export function createAndUpdateBatch() {
  const productId = __ENV.K6_DEFAULT_PRODUCT_ID;

  if (!productId) {
    console.warn('K6_DEFAULT_PRODUCT_ID not set, skipping batch operations');
    sleep(1);
    return;
  }

  // Create batch first
  const createPayload = {
    product_id: productId,
    batch_number: generateBatchNumber(),
    quantity: randomInt(20, 50),
    production_date: getTodayDate(),
    cost_per_unit: 10.00,
  };

  const createRes = supabaseRequest('POST', '/functions/v1/product-batches', createPayload, {
    tags: { endpoint: 'product-batches-create' },
  });

  const createSuccess = check(createRes, {
    'batch created': (r) => r.status === 201 || r.status === 207,
  });

  if (!createSuccess) {
    sleep(1);
    return;
  }

  let batchId, originalQty;
  try {
    const data = createRes.json();
    batchId = data.batch.id;
    originalQty = data.batch.quantity;
  } catch {
    sleep(1);
    return;
  }

  sleep(0.5);

  // Now update the batch
  const newQty = originalQty + randomInt(5, 20);
  const updatePayload = {
    batch_id: batchId,
    quantity: newQty,
    original_quantity: originalQty,
    cost_per_unit: parseFloat((randomInt(80, 150) / 10).toFixed(2)),
    notes: 'k6 updated batch',
  };

  const updateRes = supabaseRequest('PUT', '/functions/v1/product-batches', updatePayload, {
    tags: { endpoint: 'product-batches-update' },
  });

  check(updateRes, {
    'batch updated': (r) => r.status === 200,
    'quantity updated': (r) => {
      try {
        const data = r.json();
        return data && data.batch && data.batch.quantity === newQty;
      } catch {
        return false;
      }
    },
    'update response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

// Negative test - validation
export function testValidation() {
  // Test missing required fields
  const invalidPayload = {
    batch_number: generateBatchNumber(),
    // missing product_id, quantity, production_date
  };

  const res = supabaseRequest('POST', '/functions/v1/product-batches', invalidPayload, {
    tags: { endpoint: 'product-batches-validation' },
  });

  check(res, {
    'validation returns 400': (r) => r.status === 400,
    'has error message': (r) => {
      try {
        const data = r.json();
        return data && data.error;
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}
