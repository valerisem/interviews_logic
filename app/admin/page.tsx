import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { BulkDelete, SelectAll } from '@/components/BulkDelete';
import { DeleteButton } from '@/components/DeleteButton';
import { ExtraTimeSelect } from '@/components/ExtraTimeSelect';
import { extraTimeLabel } from '@/lib/extraTime';
import { TopBar } from '@/components/TopBar';
import { requireAdminPage } from '@/lib/adminSession';
import { closeExpiredAssessments, isTestAttempt } from '@/lib/assessment';
import { formatDate, formatDuration } from '@/lib/format';
import { db } from '@/lib/supabase';
import { ASSESSMENTS, ASSESSMENT_TYPES, isAssessmentType } from '@/lib/questionBank';
import { CATEGORY_SHORT, type AssessmentRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Row = Pick<
  AssessmentRow,
  'id' | 'candidate_name' | 'candidate_email' | 'role' | 'assessment_type' | 'assessment_version' | 'status' | 'overall_score' | 'category_scores' | 'completion_time_seconds' | 'tab_leave_count' | 'started_at' | 'time_multiplier'
>;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const email = await requireAdminPage();
  await closeExpiredAssessments();
  const { type: requested } = await searchParams;
  const type = isAssessmentType(requested) ? requested : 'campaign_manager';
  const def = ASSESSMENTS[type];

  const { data, error } = await db()
    .from('candidate_assessments')
    .select('id, candidate_name, candidate_email, role, assessment_type, assessment_version, status, overall_score, category_scores, completion_time_seconds, tab_leave_count, started_at, time_multiplier')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const all = (data ?? []) as Row[];
  const rows = all.filter((r) => (r.assessment_type ?? 'campaign_manager') === type);
  const counts = Object.fromEntries(ASSESSMENT_TYPES.map((t) => [t, all.filter((r) => (r.assessment_type ?? 'campaign_manager') === t).length]));
  const base = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL.replace(/\/$/, '')}/form` : '';

  return (
    <>
      <TopBar
        wide
        right={
          <span className="row" style={{ gap: 16, flexWrap: 'nowrap' }}>
          <a href="/form" target="_blank" rel="noopener" className="header-btn">Take Test</a>
          <span className="muted" style={{ fontSize: 14 }}>{email}</span>
          <form method="post" action="/api/admin/logout">
            <button type="submit" className="header-link" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--heading)' }}>Sign Out</button>
          </form>
          </span>
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

        <nav className="tabs" aria-label="Role">
          {ASSESSMENT_TYPES.map((t) => (
            <Link key={t} href={`/admin?type=${t}`} className={`tab${t === type ? ' active' : ''}`} aria-current={t === type ? 'page' : undefined}>
              {ASSESSMENTS[t].role} <span className="tab-count">{counts[t]}</span>
            </Link>
          ))}
        </nav>

        <BulkDelete key={type} />
        <div className="table-wrap">
          {rows.length === 0 ? (
            <p className="empty">No {def.role} candidates yet. Share the assessment link to get started.</p>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th className="select-cell"><SelectAll key={type} /></th>
                  <th>Candidate</th>
                  <th>Date</th>
                  <th>Score</th>
                  {def.categories.map((c) => <th key={c}>{CATEGORY_SHORT[c]}</th>)}
                  <th>Time Taken</th>
                  <th>Extra Time</th>
                  <th>Tab Leaves</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="select-cell">
                      <input type="checkbox" className="checkbox row-select" value={r.id} aria-label={`Select ${r.candidate_name}`} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.candidate_name}{isTestAttempt(r) && <span className="test-pill">Test</span>}</div>
                      <div className="muted">{r.candidate_email} · {r.role}</div>
                    </td>
                    <td className="num">{formatDate(r.started_at)}</td>
                    <td>{r.status === 'completed' ? <span className="score">{r.overall_score} / 100</span> : <span className="status">In Progress</span>}</td>
                    {def.categories.map((c) => (
                      <td key={c} className="num">{r.category_scores?.[c] !== undefined ? `${r.category_scores[c]}%` : '—'}</td>
                    ))}
                    <td className="num">{formatDuration(r.completion_time_seconds)}</td>
                    <td>{r.status === 'completed' ? extraTimeLabel(r.time_multiplier) : <ExtraTimeSelect id={r.id} value={Number(r.time_multiplier)} />}</td>
                    <td className="num">{r.tab_leave_count}</td>
                    <td>
                      <span className="row" style={{ gap: 16, flexWrap: 'nowrap' }}>
                        <Link href={`/admin/candidates/${r.id}`} style={{ fontWeight: 700 }}>Review</Link>
                        <DeleteButton id={r.id} name={r.candidate_name} />
                      </span>
                    </td>
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
