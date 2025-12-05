import { test, expect } from './fixtures/api-fixtures';

const PRODUCT_BATCHES_PATH = '/functions/v1/product-batches';

test.describe('Product Batches API', () => {
  const testProductId = process.env.PLAYWRIGHT_DEFAULT_PRODUCT_ID || process.env.K6_DEFAULT_PRODUCT_ID;

  test('POST /product-batches fails with missing required fields', async ({ api }) => {
    const res = await api.post(PRODUCT_BATCHES_PATH, {
      data: {
        product_id: testProductId,
        // missing batch_number, quantity, production_date
      },
    });

    expect(res.status(), 'status should be 400 for missing fields').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  test('POST /product-batches fails with invalid quantity', async ({ api }) => {
    if (!testProductId) {
      test.skip(true, 'PLAYWRIGHT_DEFAULT_PRODUCT_ID must be set');
      return;
    }

    const res = await api.post(PRODUCT_BATCHES_PATH, {
      data: {
        product_id: testProductId,
        batch_number: `TEST-${Date.now()}`,
        quantity: -5, // Invalid negative quantity
        production_date: new Date().toISOString().split('T')[0],
      },
    });

    expect(res.status(), 'status should be 400 for invalid quantity').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Quantity must be a positive number');
  });

  test('POST /product-batches fails with non-existent product', async ({ api }) => {
    const res = await api.post(PRODUCT_BATCHES_PATH, {
      data: {
        product_id: '00000000-0000-0000-0000-000000000000',
        batch_number: `TEST-${Date.now()}`,
        quantity: 10,
        production_date: new Date().toISOString().split('T')[0],
      },
    });

    expect(res.status(), 'status should be 404 for non-existent product').toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Product not found');
  });

  test('POST /product-batches creates batch with minimal valid payload', async ({ api }) => {
    if (!testProductId) {
      test.skip(true, 'PLAYWRIGHT_DEFAULT_PRODUCT_ID must be set');
      return;
    }

    const batchNumber = `BATCH-${Date.now()}`;
    const productionDate = new Date().toISOString().split('T')[0];

    const res = await api.post(PRODUCT_BATCHES_PATH, {
      data: {
        product_id: testProductId,
        batch_number: batchNumber,
        quantity: 25,
        production_date: productionDate,
      },
    });

    const body = await res.json();
    if (res.status() !== 201 && res.status() !== 207) {
      console.error('Batch creation failed:', body);
    }

    expect([201, 207]).toContain(res.status());
    expect(body.success).toBe(true);
    expect(body.batch).toBeTruthy();
    expect(body.batch.batch_number).toBe(batchNumber);
    expect(body.batch.quantity).toBe(25);
    expect(body.batch.product_id).toBe(testProductId);
  });

  test('POST /product-batches creates batch with full payload', async ({ api }) => {
    if (!testProductId) {
      test.skip(true, 'PLAYWRIGHT_DEFAULT_PRODUCT_ID must be set');
      return;
    }

    const batchNumber = `FULL-BATCH-${Date.now()}`;
    const productionDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year from now

    const res = await api.post(PRODUCT_BATCHES_PATH, {
      data: {
        product_id: testProductId,
        batch_number: batchNumber,
        quantity: 50,
        production_date: productionDate,
        expiry_date: expiryDate,
        cost_per_unit: 15.50,
        notes: 'Test batch with full payload',
      },
    });

    const body = await res.json();
    if (res.status() !== 201 && res.status() !== 207) {
      console.error('Full batch creation failed:', body);
    }

    expect([201, 207]).toContain(res.status());
    expect(body.success).toBe(true);
    expect(body.batch).toBeTruthy();
    expect(body.batch.batch_number).toBe(batchNumber);
    expect(body.batch.quantity).toBe(50);
    expect(Number(body.batch.cost_per_unit)).toBe(15.50);
    expect(body.batch.notes).toBe('Test batch with full payload');
  });

  test('PUT /product-batches fails with missing required fields', async ({ api }) => {
    const res = await api.put(PRODUCT_BATCHES_PATH, {
      data: {
        // missing batch_id and quantity
        notes: 'Updated notes',
      },
    });

    expect(res.status(), 'status should be 400 for missing fields').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  test('PUT /product-batches fails with non-existent batch', async ({ api }) => {
    const res = await api.put(PRODUCT_BATCHES_PATH, {
      data: {
        batch_id: '00000000-0000-0000-0000-000000000000',
        quantity: 100,
        original_quantity: 50,
      },
    });

    expect(res.status(), 'status should be 404 for non-existent batch').toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Batch not found');
  });

  test('PUT /product-batches fails with negative quantity', async ({ api }) => {
    // Create a batch first, then try to update it
    if (!testProductId) {
      test.skip(true, 'PLAYWRIGHT_DEFAULT_PRODUCT_ID must be set');
      return;
    }

    const batchNumber = `UPDATE-NEG-${Date.now()}`;
    const createRes = await api.post(PRODUCT_BATCHES_PATH, {
      data: {
        product_id: testProductId,
        batch_number: batchNumber,
        quantity: 10,
        production_date: new Date().toISOString().split('T')[0],
      },
    });

    const createBody = await createRes.json();
    if (![201, 207].includes(createRes.status())) {
      test.skip(true, 'Could not create test batch');
      return;
    }

    const batchId = createBody.batch.id;

    const res = await api.put(PRODUCT_BATCHES_PATH, {
      data: {
        batch_id: batchId,
        quantity: -5,
        original_quantity: 10,
      },
    });

    expect(res.status(), 'status should be 400 for negative quantity').toBe(400);
    const body = await res.json();
    expect(body.error).toContain('non-negative');
  });

  test('PUT /product-batches updates batch quantity', async ({ api }) => {
    if (!testProductId) {
      test.skip(true, 'PLAYWRIGHT_DEFAULT_PRODUCT_ID must be set');
      return;
    }

    // Create a batch first
    const batchNumber = `UPDATE-TEST-${Date.now()}`;
    const createRes = await api.post(PRODUCT_BATCHES_PATH, {
      data: {
        product_id: testProductId,
        batch_number: batchNumber,
        quantity: 30,
        production_date: new Date().toISOString().split('T')[0],
      },
    });

    const createBody = await createRes.json();
    if (![201, 207].includes(createRes.status())) {
      test.skip(true, 'Could not create test batch');
      return;
    }

    const batchId = createBody.batch.id;

    // Now update it
    const res = await api.put(PRODUCT_BATCHES_PATH, {
      data: {
        batch_id: batchId,
        quantity: 45,
        original_quantity: 30,
        notes: 'Updated quantity for testing',
      },
    });

    const body = await res.json();
    if (res.status() !== 200) {
      console.error('Batch update failed:', body);
    }

    expect(res.status(), `Batch update should succeed, got: ${JSON.stringify(body)}`).toBe(200);
    expect(body.success).toBe(true);
    expect(body.batch).toBeTruthy();
    expect(body.batch.quantity).toBe(45);
    expect(body.batch.notes).toBe('Updated quantity for testing');
  });

  test('PUT /product-batches updates batch cost per unit', async ({ api }) => {
    if (!testProductId) {
      test.skip(true, 'PLAYWRIGHT_DEFAULT_PRODUCT_ID must be set');
      return;
    }

    // Create a batch first
    const batchNumber = `COST-TEST-${Date.now()}`;
    const createRes = await api.post(PRODUCT_BATCHES_PATH, {
      data: {
        product_id: testProductId,
        batch_number: batchNumber,
        quantity: 20,
        production_date: new Date().toISOString().split('T')[0],
        cost_per_unit: 10.00,
      },
    });

    const createBody = await createRes.json();
    if (![201, 207].includes(createRes.status())) {
      test.skip(true, 'Could not create test batch');
      return;
    }

    const batchId = createBody.batch.id;

    // Update cost per unit
    const res = await api.put(PRODUCT_BATCHES_PATH, {
      data: {
        batch_id: batchId,
        quantity: 20,
        original_quantity: 20,
        cost_per_unit: 12.50,
      },
    });

    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(Number(body.batch.cost_per_unit)).toBe(12.50);
  });

  test('Method not allowed for DELETE', async ({ api }) => {
    const res = await api.delete(PRODUCT_BATCHES_PATH);

    expect(res.status(), 'status should be 405 for DELETE').toBe(405);
    const body = await res.json();
    expect(body.error).toContain('Method not allowed');
  });

  test('Method not allowed for GET', async ({ api }) => {
    const res = await api.get(PRODUCT_BATCHES_PATH);

    expect(res.status(), 'status should be 405 for GET').toBe(405);
    const body = await res.json();
    expect(body.error).toContain('Method not allowed');
  });
});
