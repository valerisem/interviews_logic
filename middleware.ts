import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidSession } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login' || pathname === '/api/admin/login') return NextResponse.next();

  if (await isValidSession(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
