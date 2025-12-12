/**
 * Direct REST API client for Supabase
 *
 * This bypasses the Supabase JS client which has issues in Miro iframe context.
 * The JS client blocks on auth initialization, but direct REST calls work fine.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

interface RestQueryOptions {
  select?: string;
  filters?: Record<string, string | number | boolean | null>;
  eq?: Record<string, string | number | boolean>;
  in?: Record<string, (string | number)[]>;
  order?: { column: string; ascending?: boolean };
  range?: { from: number; to: number };
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
}

interface RestResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number;
}

/**
 * Execute a direct REST query to Supabase
 */
export async function supabaseRestQuery<T = unknown>(
  table: string,
  options: RestQueryOptions = {}
): Promise<RestResponse<T>> {
  const { select = '*', eq = {}, filters = {}, order, range, limit, single, maybeSingle } = options;
  const inFilters = options.in || {};

  // Build URL
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set('select', select);

  // Add eq filters
  for (const [key, value] of Object.entries(eq)) {
    url.searchParams.set(key, `eq.${value}`);
  }

  // Add in filters
  for (const [key, values] of Object.entries(inFilters)) {
    url.searchParams.set(key, `in.(${values.join(',')})`);
  }

  // Add other filters
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  // Add ordering
  if (order) {
    url.searchParams.set('order', `${order.column}.${order.ascending ? 'asc' : 'desc'}`);
  }

  // Add limit
  if (limit) {
    url.searchParams.set('limit', String(limit));
  }

  // Build headers
  const headers: Record<string, string> = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  // Request count in header
  if (range) {
    headers['Range'] = `${range.from}-${range.to}`;
    headers['Prefer'] = 'count=exact';
  }

  console.log(`[SupabaseRest] GET ${table}`, { select, eq, inFilters, order, limit });

  try {
    const startTime = Date.now();
    const response = await fetch(url.toString(), { headers });
    const elapsed = Date.now() - startTime;

    console.log(`[SupabaseRest] Response in ${elapsed}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SupabaseRest] Error:`, errorText);
      return {
        data: null,
        error: { message: errorText, code: String(response.status) },
      };
    }

    const data = await response.json();

    // Parse count from Content-Range header if present
    let count: number | undefined;
    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match?.[1]) {
        count = parseInt(match[1], 10);
      }
    }

    // Handle single/maybeSingle
    if (single) {
      if (Array.isArray(data) && data.length === 0) {
        return { data: null, error: { message: 'No rows found' } };
      }
      if (Array.isArray(data) && data.length > 1) {
        return { data: null, error: { message: 'Multiple rows returned' } };
      }
      const result: RestResponse<T> = { data: Array.isArray(data) ? data[0] : data, error: null };
      if (count !== undefined) result.count = count;
      return result;
    }

    if (maybeSingle) {
      if (Array.isArray(data) && data.length === 0) {
        return { data: null, error: null };
      }
      if (Array.isArray(data) && data.length > 1) {
        return { data: null, error: { message: 'Multiple rows returned' } };
      }
      const result: RestResponse<T> = { data: Array.isArray(data) ? data[0] : data, error: null };
      if (count !== undefined) result.count = count;
      return result;
    }

    const result: RestResponse<T> = { data, error: null };
    if (count !== undefined) result.count = count;
    return result;
  } catch (error) {
    console.error(`[SupabaseRest] Fetch error:`, error);
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Check if we're in Miro iframe context
 */
export function isInMiroIframe(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

export { supabaseUrl, supabaseAnonKey };
