import { supabase } from '@shared/lib/supabase';
import { env } from '@shared/config/env';
import { callEdgeFunction } from '@shared/lib/edgeFunctions';

export const miroOAuthService = {
  async start(boardId?: string | null): Promise<{ authUrl: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error('Missing Supabase session');
    }

    return await callEdgeFunction<{ ok: boolean; authUrl: string }>(
      'miro-oauth-start',
      { boardId: boardId ?? null },
      {
        headers: {
          apikey: env.supabase.anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  },

  async complete(code: string, state: string): Promise<{ ok: boolean; boardId: string | null }> {
    return await callEdgeFunction<{ ok: boolean; boardId: string | null }>('miro-oauth-callback', {
      code,
      state,
    });
  },
};
