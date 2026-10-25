import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/appUrl';
import { ADMIN_COOKIE, SESSION_HOURS, createSessionValue } from '@/lib/auth';
import { checkPassword, tooManyAttempts } from '@/lib/passwordLogin';
import { safeNext } from '@/lib/returnPath';

/** Email + password sign-in for admins listed in ADMIN_PASSWORDS. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get('email') ?? '').trim().toLowerCase();
  const password = String(form?.get('password') ?? '').trim();
  const next = safeNext(String(form?.get('next') ?? ''));
  const back = next === '/admin' ? '' : `&next=${encodeURIComponent(next)}`;
  const fail = (reason: string) => NextResponse.redirect(appUrl(`/admin/login?error=${reason}${back}`, req.url), 303);

  if (!email || !password) return fail('password');
  if (tooManyAttempts(email)) return fail('locked');
  const admin = checkPassword(email, password);
  if (!admin) return fail('password');

  const res = NextResponse.redirect(appUrl(next, req.url), 303);
  res.cookies.set(ADMIN_COOKIE, await createSessionValue(admin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
