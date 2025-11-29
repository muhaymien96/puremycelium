import { test as base, expect as baseExpect, request, APIRequestContext } from '@playwright/test';
import { getTestUserToken } from '../utils/auth';

export type ApiFixtures = {
  api: APIRequestContext;
};

export const test = base.extend<ApiFixtures>({
  api: async ({ playwright, baseURL }, use) => {
    if (!baseURL) {
      throw new Error('PLAYWRIGHT_API_BASE_URL or K6_SUPABASE_URL must be set');
    }

    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY must be set for API tests');
    }

    // Authenticate as test user to get a valid JWT token for Edge Functions
    const userToken = await getTestUserToken();

    const apiRequestContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        apikey: anonKey,
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
    });

    await use(apiRequestContext);

    await apiRequestContext.dispose();
  },
});

export const expect = baseExpect;
