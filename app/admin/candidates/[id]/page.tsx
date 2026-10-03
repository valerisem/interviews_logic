import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LETTERS, QuestionBlocks } from '@/components/QuestionBlocks';
import { TimeLimitEditor } from '@/components/TimeLimitEditor';
import { TopBar } from '@/components/TopBar';
import { requireAdminPage } from '@/lib/adminSession';
import { closeExpiredAssessments } from '@/lib/assessment';
import { formatDate, formatDuration } from '@/lib/format';
import { isCorrect } from '@/lib/scoring';
import { db } from '@/lib/supabase';
import { CATEGORIES, CATEGORY_LABELS, type AssessmentRow, type Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

function describe(q: Question, ids: string[]): string {
  if (!ids.length) return 'No answer (time ran out)';
  return q.options
    .map((o, i) => (ids.includes(o.id) ? `${LETTERS[i]} · ${o.text}` : null))
    .filter(Boolean)
    .join(' / ');
}

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await closeExpiredAssessments();

  const { data, error } = await db().from('assessments').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const row = data as AssessmentRow;
  const questions = row.questions ?? [];
  const answers = new Map(row.answers.map((a) => [a.questionIndex, a]));

  return (
    <>
      <TopBar>
        <Link href="/admin" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>← All candidates</Link>
      </TopBar>
      <main className="admin narrow">
        <div className="stack-sm">
          <h1 className="title-md">{row.candidate_name}</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            {row.candidate_email} · {row.role} · {formatDate(row.completed_at ?? row.started_at)} · Version {row.assessment_version} ·{' '}
            {Math.round(row.time_limit_seconds / 60)} min limit
          </p>
        </div>

        {row.status !== 'completed' ? (
          <div className="note" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{row.status === 'invited' ? 'The candidate has not started this assessment yet.' : 'The candidate is currently taking this assessment. A new time limit applies immediately.'}</span>
            <TimeLimitEditor id={row.id} minutes={Math.round(row.time_limit_seconds / 60)} />
          </div>
        ) : (
          <>
            <div className="stats">
              <div>
                <span className="muted">Overall score</span>
                <span className="stat-value" style={{ color: 'var(--purple)' }}>
                  {row.overall_score}<span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 500 }}> / 100</span>
                </span>
                <span className="muted">{row.correct_count} of {questions.length} correct</span>
              </div>
              <div>
                <span className="muted">Completion time</span>
                <span className="stat-value">{formatDuration(row.completion_time_seconds)}</span>
                <span className="muted">{row.timed_out ? 'Time limit reached' : 'Recorded separately from score'}</span>
              </div>
              <div>
                <span className="muted">Left the tab</span>
                <span className="stat-value">{row.tab_leave_count}</span>
                <span className="muted">times during the assessment</span>
              </div>
            </div>

            <section className="stack" style={{ gap: 14 }}>
              <div className="stack-sm">
                <h2 className="h2">Category scores</h2>
                <p className="muted">Percentage of questions answered correctly in each skill area.</p>
              </div>
              {CATEGORIES.map((c) => {
                const s = row.category_scores![c];
                return (
                  <div className="bar-row" key={c}>
                    <span style={{ color: 'var(--text-2)' }}>{CATEGORY_LABELS[c]}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${s.score}%` }} /></div>
                    <span className="num" style={{ textAlign: 'right' }}><strong style={{ fontWeight: 600 }}>{s.score}%</strong> <span className="muted">· {s.correct} of {s.total} correct</span></span>
                  </div>
                );
              })}
            </section>
          </>
        )}

        {questions.length > 0 && (
          <section className="stack">
            <h2 className="h2">Answers</h2>
            {questions.map((q, i) => {
              const answer = answers.get(i);
              const ok = isCorrect(q, answer);
              const pending = row.status !== 'completed' && !answer;
              return (
                <article className="review" key={i}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span style={{ fontWeight: 600 }}>Question {i + 1}</span>
                      <span className="tag">{CATEGORY_LABELS[q.category]}</span>
                    </div>
                    {!pending && <span className={`tag ${ok ? 'ok' : 'bad'}`}>{ok ? 'Correct' : 'Incorrect'}</span>}
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 500 }}>{q.prompt}</p>
                  <div className="answer-grid">
                    <div><span className="muted" style={{ fontSize: 14 }}>Candidate answer</span>&nbsp;&nbsp;<strong style={{ fontWeight: 600 }}>{pending ? '—' : describe(q, answer?.selected ?? [])}</strong></div>
                    <div><span className="muted" style={{ fontSize: 14 }}>Correct answer</span>&nbsp;&nbsp;<strong style={{ fontWeight: 600 }}>{describe(q, q.correct)}</strong></div>
                  </div>
                  <details>
                    <summary>Show the question as the candidate saw it</summary>
                    <div className="stack">
                      <QuestionBlocks blocks={q.blocks} />
                      <ul className="option-list">
                        {q.options.map((o, j) => (
                          <li key={o.id}>
                            <strong>{LETTERS[j]}</strong>
                            <span>{o.text}</span>
                            {q.correct.includes(o.id) && <span className="mark">correct</span>}
                            {answer?.selected.includes(o.id) && <span className="mark">selected</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </>
  );
}
