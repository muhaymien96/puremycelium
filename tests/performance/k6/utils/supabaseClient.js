import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.K6_SUPABASE_URL;
const serviceRoleKey = __ENV.SUPABASE_SERVICE_ROLE_KEY || __ENV.K6_SERVICE_ROLE_KEY;

if (!baseUrl) {
  throw new Error('K6_SUPABASE_URL is required for k6 tests');
}
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY or K6_SERVICE_ROLE_KEY is required for k6 tests');
}

export function supabaseRequest(method, path, body, params = {}) {
  const url = `${baseUrl}${path}`;
  const headers = Object.assign(
    {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    params.headers || {}
  );

  const res = http.request(method, url, body ? JSON.stringify(body) : null, {
    headers,
    tags: params.tags,
  });

  check(res, {
    'status is not 5xx': (r) => r.status < 500,
  });

  return res;
}
