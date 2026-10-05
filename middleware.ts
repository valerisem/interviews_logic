import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidSession } from './lib/auth';

/*
 * The app lives on houseofmarketer.com alongside a redirect to the main website:
 *   /form/...   candidate assessment (and its privacy notice)
 *   /admin/...  admin dashboard (Google sign-in)
 *   /api/...    the app's own endpoints
 *   /           → /form (the bare address opens the assessment)
 *   anything else → REDIRECT_URL (https://houseofmarketers.com)
 */
const APP_PREFIXES = ['/form', '/admin', '/api/', '/_next/'];
const APP_FILES = ['/logo-horizontal.png', '/logo-horizontal-white.png', '/icon.png'];

function isAppPath(pathname: string): boolean {
  return APP_FILES.includes(pathname) || APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/') return NextResponse.redirect(new URL('/form', req.url), 307);
  if (!isAppPath(pathname)) {
    return NextResponse.redirect(process.env.REDIRECT_URL || 'https://houseofmarketers.com', 302);
  }

  // Admin area: everything except the sign-in page and Google's return needs a session.
  const adminArea = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
  if (!adminArea || pathname === '/admin/login') return NextResponse.next();
  if (await isValidSession(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  // Run on every request except Next's own build files.
  matcher: ['/((?!_next/static|_next/image).*)'],
};
