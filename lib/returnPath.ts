/**
 * Where to send an admin after signing in. Only pages on this app are allowed (never another site),
 * so a crafted link cannot bounce someone elsewhere. Defaults to the dashboard.
 */
const ALLOWED = ['/careers', '/admin'];
export const NEXT_COOKIE = 'admin_next';

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/admin';
  const path = value.split(/[?#]/)[0];
  return ALLOWED.some((p) => path === p || path.startsWith(`${p}/`)) ? value : '/admin';
}
