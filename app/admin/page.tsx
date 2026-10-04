import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { ExtraTimeSelect } from '@/components/ExtraTimeSelect';
import { extraTimeLabel } from '@/lib/extraTime';
import { TopBar } from '@/components/TopBar';
import { requireAdminPage } from '@/lib/adminSession';
import { closeExpiredAssessments } from '@/lib/assessment';
import { formatDate, formatDuration } from '@/lib/format';
import { db } from '@/lib/supabase';
import { CATEGORIES, type AssessmentRow, type Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SHORT_LABELS: Record<Category, string> = {
  attention_to_detail: 'Detail',
  financial_accuracy: 'Financial',
  following_requirements: 'Requirements',
  prioritisation: 'Priority',
  logical_reasoning: 'Logic',
  operational_judgement: 'Judgement',
};

type Row = Pick<
  AssessmentRow,
  'id' | 'candidate_name' | 'candidate_email' | 'role' | 'status' | 'overall_score' | 'category_scores' | 'completion_time_seconds' | 'tab_leave_count' | 'started_at' | 'time_multiplier'
>;

export default async function Dashboard() {
  await requireAdminPage();
  await closeExpiredAssessments();

  const { data, error } = await db()
    .from('candidate_assessments')
    .select('id, candidate_name, candidate_email, role, status, overall_score, category_scores, completion_time_seconds, tab_leave_count, started_at, time_multiplier')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const base = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '');

  return (
    <>
      <TopBar
        wide
        right={
          <form method="post" action="/api/admin/logout">
            <button type="submit" className="header-link" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--heading)' }}>Sign Out</button>
          </form>
        }
      />
      <main className="admin">
        <div className="admin-head">
          <h1 className="title-md">Candidate <span className="accent">Assessments</span></h1>
          <div className="share">
            <span className="muted" style={{ fontWeight: 600 }}>Assessment Link</span>
            <code>{base || 'Set APP_BASE_URL'}</code>
            {base && <CopyButton text={base} label="Copy" />}
          </div>
        </div>

        <div className="table-wrap">
          {rows.length === 0 ? (
            <p className="empty">No candidates yet. Share the assessment link to get started.</p>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Date</th>
                  <th>Score</th>
                  {CATEGORIES.map((c) => <th key={c}>{SHORT_LABELS[c]}</th>)}
                  <th>Time Taken</th>
                  <th>Extra Time</th>
                  <th>Tab Leaves</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.candidate_name}</div>
                      <div className="muted">{r.candidate_email} · {r.role}</div>
                    </td>
                    <td className="num">{formatDate(r.started_at)}</td>
                    <td>{r.status === 'completed' ? <span className="score">{r.overall_score} / 100</span> : <span className="status">In Progress</span>}</td>
                    {CATEGORIES.map((c) => (
                      <td key={c} className="num">{r.category_scores ? `${r.category_scores[c]}%` : '—'}</td>
                    ))}
                    <td className="num">{formatDuration(r.completion_time_seconds)}</td>
                    <td>{r.status === 'completed' ? extraTimeLabel(r.time_multiplier) : <ExtraTimeSelect id={r.id} value={Number(r.time_multiplier)} />}</td>
                    <td className="num">{r.tab_leave_count}</td>
                    <td><Link href={`/admin/candidates/${r.id}`} style={{ fontWeight: 700 }}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
