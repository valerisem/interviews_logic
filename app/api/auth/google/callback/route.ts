import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, SESSION_HOURS, createSessionValue } from '@/lib/auth';
import { OAUTH_COOKIE, checkClaims, exchangeCode } from '@/lib/google';
import { isAdminEmail } from '@/lib/admins';

/** Google sends the recruiter back here. Only listed houseofmarketers.com accounts get a session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/admin/login?error=${reason}`, req.url), 303);
    res.cookies.delete({ name: OAUTH_COOKIE, path: '/api/auth/google' });
    return res;
  };

  const cookie = req.headers.get('cookie')?.match(new RegExp(`${OAUTH_COOKIE}=([^;]+)`))?.[1];
  const [state, nonce] = (cookie ?? '').split('.');
  const code = url.searchParams.get('code');
  if (!state || !nonce || !code || url.searchParams.get('state') !== state) return fail('failed');

  try {
    const result = checkClaims(await exchangeCode(code, req.url), nonce);
    if ('error' in result) return fail(result.error);

    if (!(await isAdminEmail(result.email))) return fail('not_allowed');

    const res = NextResponse.redirect(new URL('/admin', req.url), 303);
    res.cookies.delete({ name: OAUTH_COOKIE, path: '/api/auth/google' });
    res.cookies.set(ADMIN_COOKIE, await createSessionValue(result.email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_HOURS * 3600,
    });
    return res;
  } catch (e) {
    console.error(e);
    return fail('failed');
  }
}
