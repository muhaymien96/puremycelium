import { createClient } from '@supabase/supabase-js';

/**
 * Helper to get an authenticated user session token for API tests
 */
export async function getTestUserToken(): Promise<string> {
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

  return data.session.access_token;
}
