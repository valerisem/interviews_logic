import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, readSession } from './auth';

/** The signed-in recruiter's email, or null. Defence in depth on top of middleware. */
export async function adminEmail(): Promise<string | null> {
  const store = await cookies();
  return readSession(store.get(ADMIN_COOKIE)?.value);
}

export async function isAdmin(): Promise<boolean> {
  return (await adminEmail()) !== null;
}

export async function requireAdminPage(): Promise<string> {
  const email = await adminEmail();
  if (!email) redirect('/admin/login');
  return email;
}
