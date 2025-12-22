import { encryptToken, decryptToken, isTokenExpired, addSecondsToNow } from './miroCrypto.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const MIRO_TOKEN_URL = 'https://api.miro.com/v1/oauth/token';

export type MiroTokenRecord = {
  id: string;
  board_id: string | null;
  miro_user_id: string | null;
  team_id: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
};

export async function storeMiroTokens(
  supabase: SupabaseClient,
  params: {
    userId: string | null;
    boardId: string | null;
    miroUserId?: string | null;
    teamId?: string | null;
    accessToken: string;
    refreshToken?: string | null;
    tokenType?: string | null;
    scope?: string | null;
    expiresIn?: number | null;
  },
  rawEncryptionKey: string
): Promise<void> {
  const accessEncrypted = await encryptToken(params.accessToken, rawEncryptionKey);
  const refreshEncrypted = params.refreshToken
    ? await encryptToken(params.refreshToken, rawEncryptionKey)
    : null;

  const expiresAt = params.expiresIn ? addSecondsToNow(params.expiresIn) : null;

  const { error } = await supabase
    .from('miro_oauth_tokens')
    .upsert(
      {
        user_id: params.userId,
        board_id: params.boardId,
        miro_user_id: params.miroUserId ?? null,
        team_id: params.teamId ?? null,
        access_token_encrypted: accessEncrypted,
        refresh_token_encrypted: refreshEncrypted,
        token_type: params.tokenType ?? null,
        scope: params.scope ?? null,
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
      },
      { onConflict: 'board_id' }
    );

  if (error) {
    throw new Error(`miro_token_upsert_failed:${error.message}`);
  }
}

export async function getMiroAccessToken(
  supabase: SupabaseClient,
  params: {
    boardId: string;
    clientId: string;
    clientSecret: string;
    encryptionKey: string;
  }
): Promise<{ accessToken: string; tokenId: string }> {
  const { data, error } = await supabase
    .from('miro_oauth_tokens')
    .select('id, board_id, access_token_encrypted, refresh_token_encrypted, expires_at, token_type, scope, miro_user_id, team_id')
    .eq('board_id', params.boardId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('miro_token_not_found');
  }

  const accessToken = await decryptToken(data.access_token_encrypted, params.encryptionKey);
  const refreshToken = data.refresh_token_encrypted
    ? await decryptToken(data.refresh_token_encrypted, params.encryptionKey)
    : null;

  if (!isTokenExpired(data.expires_at)) {
    return { accessToken, tokenId: data.id };
  }

  if (!refreshToken) {
    throw new Error('miro_refresh_token_missing');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  const res = await fetch(MIRO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`miro_refresh_failed:${res.status}:${text.slice(0, 300)}`);
  }

  const payload = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  if (!payload.access_token) {
    throw new Error('miro_refresh_missing_access_token');
  }

  await storeMiroTokens(
    supabase,
    {
      userId: null,
      boardId: params.boardId,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? refreshToken,
      tokenType: payload.token_type ?? null,
      scope: payload.scope ?? null,
      expiresIn: payload.expires_in ?? null,
    },
    params.encryptionKey
  );

  return { accessToken: payload.access_token, tokenId: data.id };
}
