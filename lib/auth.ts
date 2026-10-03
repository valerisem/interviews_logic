/*
 * Minimal recruiter authentication: a single shared password (ADMIN_PASSWORD)
 * and a signed, expiring session cookie. Uses Web Crypto so it also runs in
 * middleware.
 */

export const ADMIN_COOKIE = 'assessment_admin';
export const SESSION_HOURS = 12;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error('ADMIN_SESSION_SECRET (or ADMIN_PASSWORD) must be set');
  return s;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionValue(): Promise<string> {
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  return `${expires}.${await hmac(`admin:${expires}`)}`;
}

export async function isValidSession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expires, sig] = value.split('.');
  if (!expires || !sig || !(Number(expires) > Date.now())) return false;
  return safeEqual(sig, await hmac(`admin:${expires}`));
}

export async function checkPassword(candidate: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Compare HMACs so the comparison does not leak the password length.
  return safeEqual(await hmac(`pw:${candidate}`), await hmac(`pw:${expected}`));
}
