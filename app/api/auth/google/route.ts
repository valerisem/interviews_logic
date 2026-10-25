import { NextResponse } from 'next/server';
import { OAUTH_COOKIE, authorisationUrl, randomToken } from '@/lib/google';
import { NEXT_COOKIE, safeNext } from '@/lib/returnPath';

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
  // Remember which page to return to (e.g. the careers page) once Google sends the admin back.
  res.cookies.set(NEXT_COOKIE, safeNext(new URL(req.url).searchParams.get('next')), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 600,
  });
  return res;
}
