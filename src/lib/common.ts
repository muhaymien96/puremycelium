/**
 * Common utility functions and constants used across the application
 */

import { format } from 'date-fns';

// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * Standard CORS headers for Supabase Edge Functions
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
} as const;

/**
 * Get CORS response headers
 */
export function getCorsHeaders(
  contentType: string = 'application/json'
): Record<string, string> {
  return {
    ...CORS_HEADERS,
    'Content-Type': contentType,
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsOptions(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

// ============================================================================
// CSV Operations
// ============================================================================

/**
 * Download data as CSV file
 * @param data - Array of objects to export
 * @param filename - Base filename (without extension)
 */
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  filename: string
): void {
  if (!data || data.length === 0) {
    console.warn('No data to download');
    return;
  }

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV content into lines
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// ============================================================================
// Currency & Formatting
// ============================================================================

/**
 * Format value as currency (South African Rand)
 */
export function formatCurrency(value: number): string {
  return `R ${value.toFixed(2)}`;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]+/g, ''));
}

// ============================================================================
// Date & Time
// ============================================================================

/**
 * Parse Yoco date-time strings (supports multiple formats)
 */
export function parseYocoDateTime(dateStr: string, timeStr: string): Date {
  // Try D/M/Y format
  const dmy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}`);
    if (!isNaN(date.getTime())) return date;
  }

  // Try Y-M-D format
  const ymd = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const [, year, month, day] = ymd;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}`);
    if (!isNaN(date.getTime())) return date;
  }

  // Fallback to new Date parsing
  const date = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr} ${timeStr}`);
  }
  return date;
}

/**
 * Normalize date to end of day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if phone number is valid (basic)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    if ('message' in error) {
      return String((error as any).message);
    }
  }
  return 'An unexpected error occurred';
}

// ============================================================================
// Query Cache Keys
// ============================================================================

/**
 * Query cache key factory for React Query
 */
export const queryKeys = {
  // Products
  products: () => ['products'],
  product: (id: string) => ['product', id],
  productBatches: (productId: string) => ['product-batches', productId],
  inactiveProducts: () => ['inactive-products'],

  // Customers
  customers: () => ['customers'],
  customer: (id: string) => ['customer', id],
  customerOrders: (customerId: string) => ['customer-orders', customerId],

  // Orders
  orders: () => ['orders'],
  order: (id: string) => ['order', id],

  // Business
  businessSettings: () => ['business_settings'],
  businessProfile: (profileId: string) => ['business_settings', profileId],

  // Events
  marketEvents: () => ['market-events'],
  marketEvent: (id: string) => ['market-event', id],

  // Expenses
  expenses: () => ['expenses'],
  expensesByEvent: (eventId: string) => ['expenses', eventId],

  // Reports
  reports: () => ['reports'],
  dashboardStats: () => ['dashboard-stats'],
  reportsData: () => ['reports-data'],

  // Imports
  importHistory: () => ['import-history'],

  // Misc
  inventoryDashboard: () => ['inventory-dashboard'],
  todaysSales: () => ['todays-sales'],
  topSellers: () => ['top-sellers'],
} as const;
