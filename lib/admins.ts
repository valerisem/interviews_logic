import 'server-only';
import { db } from './supabase';

/**
 * Recruiters allowed into the dashboard:
 * - team members whose ids are listed in ADMIN_TEAM_IDS (comma-separated, e.g. "3,7").
 *   Their work email and leaving date come from the existing public.team table;
 *   access ends once they have left.
 * - people outside the company (e.g. an external recruiter) listed by email in
 *   ADMIN_EXTRA_EMAILS (comma-separated). They sign in with a verified Google account.
 */
export function adminTeamIds(): number[] {
  return (process.env.ADMIN_TEAM_IDS ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function extraAdminEmails(): string[] {
  return (process.env.ADMIN_EXTRA_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes('@'));
}

export async function isAdminEmail(email: string): Promise<boolean> {
  if (extraAdminEmails().includes(email.toLowerCase())) return true;
  const ids = adminTeamIds();
  if (!ids.length) return false;
  const { data, error } = await db().from('team').select('work_email, left_date').in('id', ids);
  if (error) throw error;
  const today = new Date().toISOString().slice(0, 10);
  return (data ?? []).some(
    (m: { work_email: string | null; left_date: string | null }) =>
      m.work_email?.toLowerCase() === email.toLowerCase() && (!m.left_date || m.left_date > today),
  );
}
