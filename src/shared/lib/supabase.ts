import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const debugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Check if we're running in a Miro iframe context
const isInMiroIframe = typeof window !== 'undefined' && window.parent !== window;

if (debugEnabled) {
  console.log('[Supabase] Initializing client:', {
    url: supabaseUrl,
    isInMiroIframe,
  });
}

// Custom fetch wrapper with logging for debugging network issues
const debugFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method || 'GET';
  const startTime = Date.now();

  console.log(`[Supabase Fetch] ${method} ${url.substring(0, 100)}...`);

  try {
    const response = await fetch(input, init);
    const elapsed = Date.now() - startTime;
    console.log(`[Supabase Fetch] ${method} completed in ${elapsed}ms, status: ${response.status}`);
    return response;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Supabase Fetch] ${method} FAILED after ${elapsed}ms:`, error);
    throw error;
  }
};

/**
 * Supabase client instance.
 *
 * Note: For type-safe queries, import types from '@shared/types/database.types':
 * - Tables<'projects'> for row types
 * - TablesInsert<'projects'> for insert types
 * - TablesUpdate<'projects'> for update types
 *
 * Full client typing is available after running: supabase gen types typescript
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable session persistence in Miro iframe to prevent auth lock issues
    persistSession: !isInMiroIframe,
    // Disable auto-refresh in Miro iframe - we handle auth manually via miroAuthService
    autoRefreshToken: !isInMiroIframe,
    // Use localStorage for session persistence (only when not in Miro)
    storage: (!isInMiroIframe && typeof window !== 'undefined') ? window.localStorage : undefined,
    // Detect session from URL (for OAuth callbacks) - disable in iframe
    detectSessionInUrl: false,
    // Flow type for PKCE
    flowType: 'pkce',
  },
  // Minimal realtime config
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    fetch: debugEnabled ? debugFetch : fetch,
  },
});

export type { User, Session } from '@supabase/supabase-js';
