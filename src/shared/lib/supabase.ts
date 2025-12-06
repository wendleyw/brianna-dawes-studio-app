import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

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
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type { User, Session } from '@supabase/supabase-js';
