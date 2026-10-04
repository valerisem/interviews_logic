import 'server-only';
import { scryptSync, timingSafeEqual } from 'node:crypto';

/*
 * Email + password sign-in for named admins who can't use Google sign-in.
 * ADMIN_PASSWORDS holds "email:salt:hash" entries (comma-separated), where hash is
 * scrypt(password, salt) in hex. Only hashes are stored; no extra tables.
 */

const KEY_LENGTH = 32;

function entries(): Map<string, { salt: string; hash: string }> {
  const map = new Map<string, { salt: string; hash: string }>();
  for (const entry of (process.env.ADMIN_PASSWORDS ?? '').split(',')) {
    const [email, salt, hash] = entry.trim().split(':');
    if (email && salt && hash) map.set(email.toLowerCase(), { salt, hash });
  }
  return map;
}

// Slows down guessing: at most 5 failed attempts per email in 15 minutes (per server instance).
const failures = new Map<string, number[]>();
const WINDOW_MS = 15 * 60_000;

export function tooManyAttempts(email: string): boolean {
  const recent = (failures.get(email) ?? []).filter((t) => Date.now() - t < WINDOW_MS);
  failures.set(email, recent);
  return recent.length >= 5;
}

/** The admin's email if the password matches, otherwise null. */
export function checkPassword(rawEmail: string, password: string): string | null {
  const email = rawEmail.trim().toLowerCase();
  const entry = entries().get(email);
  // Hash even for unknown emails so response time doesn't reveal which emails exist.
  const salt = entry?.salt ?? '00';
  const actual = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(entry?.hash ?? '00'.repeat(KEY_LENGTH), 'hex');
  const ok = !!entry && expected.length === KEY_LENGTH && timingSafeEqual(actual, expected);
  if (!ok) failures.set(email, [...(failures.get(email) ?? []), Date.now()]);
  return ok ? email : null;
}
