import { test, expect } from './fixtures/api-fixtures';

const PRODUCTS_PATH = '/functions/v1/products';

// Basic contract + behavior tests for products edge function

test.describe('Products API', () => {
  test('GET /products returns products array with stock info', async ({ api }) => {
    const res = await api.get(PRODUCTS_PATH);

    expect(res.status(), 'status should be 200').toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.products)).toBeTruthy();

    if (body.products.length > 0) {
      const product = body.products[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('total_stock');
      expect(product).toHaveProperty('batches');
    }
  });

  test('POST /products fails with missing required fields', async ({ api }) => {
    const res = await api.post(PRODUCTS_PATH, {
      data: {
        name: 'Missing fields product',
        // category and unit_price intentionally omitted
      },
    });

    expect(res.status(), 'status should be 400 for invalid payload').toBe(400);
  });

  test('POST /products creates a product with minimal valid payload', async ({ api }) => {
    const payload = {
      name: `Test Product ${Date.now()}`,
      category: 'other',
      unit_price: 100,
    };

    const res = await api.post(PRODUCTS_PATH, { data: payload });
    const body = await res.json();

    // Log response for debugging
    if (res.status() !== 201) {
      console.error(`Unexpected status ${res.status()}:`, body);
    }

    expect(res.status(), `status should be 201 on success, got: ${JSON.stringify(body)}`).toBe(201);

    expect(body.product).toBeTruthy();
    expect(body.product.name).toBe(payload.name);
    expect(body.product.category).toBe(payload.category);
    expect(Number(body.product.unit_price)).toBe(payload.unit_price);
  });
});
