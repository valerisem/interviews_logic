import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { TimeLimitEditor } from '@/components/TimeLimitEditor';
import { TopBar } from '@/components/TopBar';
import { requireAdminPage } from '@/lib/adminSession';
import { closeExpiredAssessments, defaultTimeLimitSeconds } from '@/lib/assessment';
import { formatDate, formatDuration } from '@/lib/format';
import { db } from '@/lib/supabase';
import { CATEGORIES, type AssessmentRow, type Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SHORT_LABELS: Record<Category, string> = {
  attention_to_detail: 'Detail',
  following_instructions: 'Instructions',
  prioritisation: 'Priority',
  numerical_reasoning: 'Numerical',
  logical_reasoning: 'Logical',
  operational_judgement: 'Judgement',
};

type Row = Pick<
  AssessmentRow,
  | 'id' | 'token' | 'candidate_name' | 'candidate_email' | 'role' | 'status' | 'overall_score' | 'category_scores'
  | 'completion_time_seconds' | 'tab_leave_count' | 'started_at' | 'completed_at' | 'created_at' | 'time_limit_seconds'
>;

export default async function Dashboard() {
  await requireAdminPage();
  await closeExpiredAssessments();

  const { data, error } = await db()
    .from('assessments')
    .select('id, token, candidate_name, candidate_email, role, status, overall_score, category_scores, completion_time_seconds, tab_leave_count, started_at, completed_at, created_at, time_limit_seconds')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const base = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '');

  return (
    <>
      <TopBar wide>
        <form method="post" action="/api/admin/logout">
          <button type="submit" className="btn btn-secondary btn-sm">Sign out</button>
        </form>
      </TopBar>
      <main className="admin">
        <div className="stack-sm">
          <h1 className="title-md">Candidate assessments</h1>
          <p className="body">Scores inform the hiring decision. They never reject a candidate automatically. The final decision rests with the recruiter or hiring manager.</p>
        </div>

        <section className="panel" style={{ gap: 12 }}>
          <h2 className="h2">Assessment link</h2>
          <div className="link-box">
            <code style={{ fontSize: 14 }}>{base || 'Set APP_BASE_URL'}</code>
            {base && <CopyButton text={base} label="Copy" />}
          </div>
          <p className="muted">
            Send every candidate the same link. They enter their name, email and role and start straight away.
            Default time limit: {Math.round(defaultTimeLimitSeconds() / 60)} min. Change it per candidate below, even while they are taking the test.
          </p>
        </section>

        <section className="table-wrap">
          {rows.length === 0 ? (
            <p className="empty">No candidates yet. Share the assessment link above.</p>
          ) : (
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Role</th>
                    <th>Date</th>
                    <th>Overall /100</th>
                    {CATEGORIES.map((c) => <th key={c}>{SHORT_LABELS[c]}</th>)}
                    <th>Time taken</th>
                    <th>Time limit</th>
                    <th>Tab leaves</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.candidate_name}</div>
                        <div className="muted">{r.candidate_email}</div>
                      </td>
                      <td>{r.role}</td>
                      <td className="num">{formatDate(r.completed_at ?? r.started_at)}</td>
                      <td>
                        {r.status === 'completed'
                          ? <span className="score-pill">{r.overall_score}</span>
                          : <span className="tag">{r.status === 'invited' ? 'Not started' : 'In progress'}</span>}
                      </td>
                      {CATEGORIES.map((c) => (
                        <td key={c} className="num">{r.category_scores ? `${r.category_scores[c].score}%` : '—'}</td>
                      ))}
                      <td className="num">{formatDuration(r.completion_time_seconds)}</td>
                      <td className="num">
                        {r.status === 'completed'
                          ? `${Math.round(r.time_limit_seconds / 60)} min`
                          : <TimeLimitEditor id={r.id} minutes={Math.round(r.time_limit_seconds / 60)} />}
                      </td>
                      <td className="num">{r.status === 'invited' ? '—' : r.tab_leave_count}</td>
                      <td>
                        <Link href={`/admin/candidates/${r.id}`} style={{ fontWeight: 500 }}>Review</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
