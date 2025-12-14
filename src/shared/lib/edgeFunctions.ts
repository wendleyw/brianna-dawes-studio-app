import { env } from '@shared/config/env';

export async function callEdgeFunction<TResponse>(
  functionName: string,
  body: unknown,
  init?: Omit<RequestInit, 'method' | 'body'>
): Promise<TResponse> {
  const url = `${env.supabase.url}/functions/v1/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    body: JSON.stringify(body),
    ...init,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Edge function ${functionName} failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as TResponse;
}

