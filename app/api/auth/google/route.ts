import { NextResponse } from 'next/server';
import { OAUTH_COOKIE, authorisationUrl, randomToken } from '@/lib/google';

/** Starts Google sign-in for recruiters. */
export async function GET(req: Request) {
  const state = randomToken();
  const nonce = randomToken();
  const res = NextResponse.redirect(authorisationUrl(req.url, state, nonce));
  res.cookies.set(OAUTH_COOKIE, `${state}.${nonce}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 600,
  });
  return res;
}
