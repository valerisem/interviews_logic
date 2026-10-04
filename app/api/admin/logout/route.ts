import { appUrl } from '@/lib/appUrl';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  const res = NextResponse.redirect(appUrl('/admin/login', req.url), 303);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
