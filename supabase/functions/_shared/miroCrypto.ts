const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    bytes[i / 2] = Number.parseInt(value.slice(i, i + 2), 16);
  }
  return bytes;
}

function decodeKey(rawKey: string): Uint8Array {
  const cleaned = rawKey.trim();
  if (!cleaned) {
    throw new Error('missing_miro_token_encryption_key');
  }
  if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    return hexToBytes(cleaned);
  }
  return base64ToBytes(cleaned);
}

async function getKey(rawKey: string): Promise<CryptoKey> {
  const keyBytes = decodeKey(rawKey);
  if (keyBytes.length !== 32) {
    throw new Error(`invalid_miro_token_encryption_key_length:${keyBytes.length}`);
  }
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(token: string, rawKey: string): Promise<string> {
  const key = await getKey(rawKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(token));
  const ivEncoded = bytesToBase64(iv);
  const cipherEncoded = bytesToBase64(new Uint8Array(cipher));
  return `${ivEncoded}.${cipherEncoded}`;
}

export async function decryptToken(payload: string, rawKey: string): Promise<string> {
  const [ivRaw, cipherRaw] = payload.split('.', 2);
  if (!ivRaw || !cipherRaw) {
    throw new Error('invalid_encrypted_token_format');
  }
  const key = await getKey(rawKey);
  const iv = base64ToBytes(ivRaw);
  const cipherBytes = base64ToBytes(cipherRaw);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  return decoder.decode(plain);
}

export function isTokenExpired(expiresAt: string | null | undefined, skewSeconds = 60): boolean {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return true;
  return expiry <= Date.now() + skewSeconds * 1000;
}

export function addSecondsToNow(seconds: number): string {
  const ms = Date.now() + Math.max(0, seconds) * 1000;
  return new Date(ms).toISOString();
}
