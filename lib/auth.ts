/*
 * Recruiter session: a signed, expiring cookie holding the admin's email, issued
 * after Google sign-in. Uses Web Crypto so it also runs in middleware.
 */

export const ADMIN_COOKIE = 'assessment_admin';
export const SESSION_HOURS = 12;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET must be set');
  return s;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
}

export async function createSessionValue(email: string): Promise<string> {
  const payload = toBase64Url(JSON.stringify({ e: email, x: Date.now() + SESSION_HOURS * 3600_000 }));
  return `${payload}.${await hmac(payload)}`;
}

/** The signed-in admin's email, or null if the cookie is missing, tampered with or expired. */
export async function readSession(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const [payload, sig] = value.split('.');
  if (!payload || !sig || !safeEqual(sig, await hmac(payload))) return null;
  try {
    const { e, x } = JSON.parse(fromBase64Url(payload)) as { e?: string; x?: number };
    return typeof e === 'string' && typeof x === 'number' && x > Date.now() ? e : null;
  } catch {
    return null;
  }
}

export async function isValidSession(value: string | undefined): Promise<boolean> {
  return (await readSession(value)) !== null;
}
