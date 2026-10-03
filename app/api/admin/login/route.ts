import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, SESSION_HOURS, checkPassword, createSessionValue } from '@/lib/auth';

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get('password') ?? '');
  if (!(await checkPassword(password))) {
    return NextResponse.redirect(new URL('/admin/login?error=1', req.url), 303);
  }
  const res = NextResponse.redirect(new URL('/admin', req.url), 303);
  res.cookies.set(ADMIN_COOKIE, await createSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
