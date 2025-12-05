import { createClient } from '@supabase/supabase-js';

// Token cache to avoid rate limiting from repeated auth calls
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Helper to get an authenticated user session token for API tests
 * Caches the token to avoid Supabase rate limiting
 */
export async function getTestUserToken(): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  const now = Date.now();
  if (cachedToken && tokenExpiry > now + 5 * 60 * 1000) {
    return cachedToken;
  }

  const supabaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || process.env.K6_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const testEmail = process.env.TEST_USER_EMAIL || process.env.PLAYWRIGHT_TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD || process.env.PLAYWRIGHT_TEST_USER_PASSWORD;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('PLAYWRIGHT_API_BASE_URL/K6_SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }

  if (!testEmail || !testPassword) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set for API tests');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error || !data.session) {
    throw new Error(`Failed to authenticate test user: ${error?.message || 'No session returned'}`);
  }

  // Cache the token with its expiry time
  cachedToken = data.session.access_token;
  // JWT tokens typically expire in 1 hour, but use the actual expiry if available
  tokenExpiry = data.session.expires_at 
    ? data.session.expires_at * 1000 
    : now + 60 * 60 * 1000;

  return cachedToken;
}

/**
 * Clear the token cache (useful for test cleanup)
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
}
