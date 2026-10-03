import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidSession } from './auth';

/** Defence in depth for admin pages and routes, on top of middleware. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(ADMIN_COOKIE)?.value);
}

export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}
