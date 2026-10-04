import 'server-only';
import { appUrl } from './appUrl';

/*
 * Google sign-in for recruiters (OpenID Connect, authorisation-code flow).
 * Only verified Google Workspace accounts on ALLOWED_DOMAIN are accepted, and the
 * email must also belong to a team member listed in ADMIN_TEAM_IDS (see lib/admins.ts).
 */

export const ALLOWED_DOMAIN = 'houseofmarketers.com';
export const OAUTH_COOKIE = 'google_oauth';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
// Overridable only so automated tests can stand in for Google.
const TOKEN_URL = process.env.GOOGLE_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error('GOOGLE_CLIENT_ID must be set');
  return id;
}

export function redirectUri(requestUrl: string): string {
  return appUrl('/api/auth/google/callback', requestUrl).toString();
}

export function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

export function authorisationUrl(requestUrl: string, state: string, nonce: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(requestUrl),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    hd: ALLOWED_DOMAIN, // pre-selects the company account; enforced again below
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params}`;
}

export interface GoogleClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  hd?: string;
  name?: string;
}

export type SignInFailure = 'failed' | 'domain';

/**
 * Checks the ID token's claims. The token comes straight from Google's token endpoint
 * over TLS in exchange for our client secret, so its signature need not be re-verified
 * (OpenID Connect Core §3.1.3.7), but issuer, audience, expiry and nonce still are.
 */
export function checkClaims(c: GoogleClaims, nonce: string, now = Date.now()): { email: string } | { error: SignInFailure } {
  if (!c.iss || !ISSUERS.includes(c.iss)) return { error: 'failed' };
  if (c.aud !== clientId()) return { error: 'failed' };
  if (!c.exp || c.exp * 1000 < now) return { error: 'failed' };
  if (!c.nonce || c.nonce !== nonce) return { error: 'failed' };
  const email = (c.email ?? '').toLowerCase();
  if (!c.email_verified || c.hd !== ALLOWED_DOMAIN || !email.endsWith(`@${ALLOWED_DOMAIN}`)) return { error: 'domain' };
  return { email };
}

export async function exchangeCode(code: string, requestUrl: string): Promise<GoogleClaims> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri(requestUrl),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  const payload = id_token?.split('.')[1];
  if (!payload) throw new Error('Google returned no ID token');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GoogleClaims;
}
