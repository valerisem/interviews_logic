import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminSession';
import { newToken } from '@/lib/assessment';
import { ASSESSMENT_VERSION } from '@/lib/questionBank';
import { db } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Create a candidate's unique assessment link. A custom time limit supports reasonable adjustments. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const role = String(body.role ?? '').trim() || 'Campaign Manager';
  const recruiterEmail = String(body.recruiterEmail ?? '').trim();
  const minutes = Number(body.timeLimitMinutes ?? process.env.DEFAULT_TIME_LIMIT_MINUTES ?? 5);

  if (!name) return NextResponse.json({ error: 'Enter the candidate’s name.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid candidate email.' }, { status: 400 });
  if (recruiterEmail && !EMAIL_RE.test(recruiterEmail)) return NextResponse.json({ error: 'Enter a valid recruiter email.' }, { status: 400 });
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
    return NextResponse.json({ error: 'Time limit must be between 1 and 240 minutes.' }, { status: 400 });
  }

  const token = newToken();
  const { error } = await db().from('assessments').insert({
    token,
    candidate_name: name,
    candidate_email: email,
    role,
    recruiter_email: recruiterEmail || null,
    assessment_version: ASSESSMENT_VERSION,
    time_limit_seconds: Math.round(minutes * 60),
  });
  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not create the link.' }, { status: 500 });
  }

  const base = (process.env.APP_BASE_URL || new URL(req.url).origin).replace(/\/$/, '');
  return NextResponse.json({ link: `${base}/a/${token}` });
}
