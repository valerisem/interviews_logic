import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AnswerError } from './assessment';

/*
 * Invisible checks on the public start form, so bots can't fill the database with junk:
 * 1. A hidden "website" field that people never see; anything in it means a bot.
 * 2. A signed timestamp issued with the page: starting within MIN_MS of loading it is
 *    too fast for a person, and posting without loading the page fails the signature.
 * 3. At most STARTS_PER_HOUR new assessments per internet connection (IP address).
 * Admins in test mode skip all three.
 */

const MIN_MS = 3_000;
const MAX_AGE_MS = 24 * 3600_000;
const STARTS_PER_HOUR = 5;

function sign(issuedAt: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET must be set');
  return createHmac('sha256', secret).update(`form:${issuedAt}`).digest('hex');
}

/** Issued with the form page and sent back on start. */
export function formStamp(now = Date.now()): string {
  return `${now}.${sign(String(now))}`;
}

function stampAge(stamp: unknown): number | null {
  if (typeof stamp !== 'string') return null;
  const [issuedAt, sig] = stamp.split('.');
  if (!issuedAt || !sig || !/^\d+$/.test(issuedAt)) return null;
  const expected = Buffer.from(sign(issuedAt), 'hex');
  const given = Buffer.from(sig, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Date.now() - Number(issuedAt);
}

// Successful starts per IP in the last hour (per server instance).
const starts = new Map<string, number[]>();

/** The visitor's IP as reported by Railway's proxy (X-Real-IP), else the last X-Forwarded-For hop. */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
}

function recentStarts(ip: string): number[] {
  const recent = (starts.get(ip) ?? []).filter((t) => Date.now() - t < 3600_000);
  starts.set(ip, recent);
  return recent;
}

export class TooManyStarts extends Error {}

/** Throws if the request looks automated. Call before creating anything. */
export function checkStart(body: { website?: unknown; formStamp?: unknown }, ip: string): void {
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    throw new AnswerError('Something went wrong. Please try again.');
  }
  const age = stampAge(body.formStamp);
  if (age === null || age > MAX_AGE_MS) {
    throw new AnswerError('This page has expired. Please reload it and try again.');
  }
  if (age < MIN_MS) throw new AnswerError('Please check your details and try again.');
  if (recentStarts(ip).length >= STARTS_PER_HOUR) {
    throw new TooManyStarts('Too many assessments have been started from this connection. Please try again later.');
  }
}

export function recordStart(ip: string): void {
  starts.set(ip, [...recentStarts(ip), Date.now()]);
}
