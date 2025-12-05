import { test, expect } from './fixtures/api-fixtures';

const INVOICES_PATH = '/functions/v1/invoices';

test.describe('Invoices API', () => {
  test('GET /invoices returns invoices list with pagination', async ({ api }) => {
    const res = await api.get(INVOICES_PATH);

    expect(res.status(), 'status should be 200').toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('count');
    expect(body).toHaveProperty('limit');
    expect(body).toHaveProperty('offset');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('GET /invoices supports status filter', async ({ api }) => {
    const res = await api.get(`${INVOICES_PATH}?status=paid`);

    expect(res.status(), 'status should be 200').toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    
    // All returned invoices should have status=paid
    for (const invoice of body.data) {
      expect(invoice.status).toBe('paid');
    }
  });

  test('GET /invoices supports delivery_status filter', async ({ api }) => {
    const res = await api.get(`${INVOICES_PATH}?delivery_status=sent`);

    expect(res.status(), 'status should be 200').toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    
    // All returned invoices should have delivery_status=sent
    for (const invoice of body.data) {
      expect(invoice.delivery_status).toBe('sent');
    }
  });

  test('GET /invoices supports date range filters', async ({ api }) => {
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    const res = await api.get(`${INVOICES_PATH}?start_date=${startDate}&end_date=${endDate}`);

    expect(res.status(), 'status should be 200').toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('GET /invoices supports pagination with limit and offset', async ({ api }) => {
    const limit = 5;
    const offset = 0;
    const res = await api.get(`${INVOICES_PATH}?limit=${limit}&offset=${offset}`);

    expect(res.status(), 'status should be 200').toBe(200);

    const body = await res.json();
    expect(body.limit).toBe(limit);
    expect(body.offset).toBe(offset);
    expect(body.data.length).toBeLessThanOrEqual(limit);
  });

  test('GET /invoices/:id returns single invoice with details', async ({ api }) => {
    // First get list to find an invoice ID
    const listRes = await api.get(`${INVOICES_PATH}?limit=1`);
    const listBody = await listRes.json();

    if (listBody.data?.length === 0) {
      test.skip(true, 'No invoices available to test');
      return;
    }

    const invoiceId = listBody.data[0].id;
    const res = await api.get(`${INVOICES_PATH}/${invoiceId}`);

    expect(res.status(), 'status should be 200').toBe(200);

    const invoice = await res.json();
    expect(invoice).toHaveProperty('id');
    expect(invoice.id).toBe(invoiceId);
    expect(invoice).toHaveProperty('invoice_number');
    expect(invoice).toHaveProperty('status');
    expect(invoice).toHaveProperty('total_amount');
  });

  test('GET /invoices/:id returns 404 for non-existent invoice', async ({ api }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await api.get(`${INVOICES_PATH}/${fakeId}`);

    expect(res.status(), 'status should be 404').toBe(404);
  });

  test('GET /invoices includes customer data when available', async ({ api }) => {
    const res = await api.get(`${INVOICES_PATH}?limit=10`);
    
    expect(res.status(), 'status should be 200').toBe(200);

    const body = await res.json();
    
    // Check that customer relationship is included
    const invoiceWithCustomer = body.data.find((inv: any) => inv.customers);
    if (invoiceWithCustomer) {
      expect(invoiceWithCustomer.customers).toHaveProperty('first_name');
      expect(invoiceWithCustomer.customers).toHaveProperty('email');
    }
  });

  test('GET /invoices includes order data when available', async ({ api }) => {
    const res = await api.get(`${INVOICES_PATH}?limit=10`);
    
    expect(res.status(), 'status should be 200').toBe(200);

    const body = await res.json();
    
    // Check that order relationship is included
    const invoiceWithOrder = body.data.find((inv: any) => inv.orders);
    if (invoiceWithOrder) {
      expect(invoiceWithOrder.orders).toHaveProperty('order_number');
    }
  });
});
