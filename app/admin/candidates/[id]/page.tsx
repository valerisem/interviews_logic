import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExtraTimeSelect } from '@/components/ExtraTimeSelect';
import { extraTimeLabel } from '@/lib/extraTime';
import { LETTERS, QuestionBlocks } from '@/components/QuestionBlocks';
import { TopBar } from '@/components/TopBar';
import { requireAdminPage } from '@/lib/adminSession';
import { closeExpiredAssessments } from '@/lib/assessment';
import { ASSESSMENTS } from '@/lib/questionBank';
import { formatDate, formatDuration } from '@/lib/format';
import { questionScore } from '@/lib/scoring';
import { db } from '@/lib/supabase';
import { CATEGORY_LABELS, type AssessmentRow, type Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

function letterAnswer(q: Question, ids: string[]): string {
  return q.options
    .map((o, i) => (ids.includes(o.id) ? `${LETTERS[i]} · ${o.text}` : null))
    .filter(Boolean)
    .join(' / ');
}

function rankingAnswer(q: Question, ids: string[]): string {
  const text = new Map(q.options.map((o) => [o.id, o.text]));
  return ids.map((id, i) => `${i + 1}. ${text.get(id)}`).join('\n');
}

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await closeExpiredAssessments();

  const { data, error } = await db().from('candidate_assessments').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const row = data as AssessmentRow;
  const questions = row.questions ?? [];
  const answers = new Map(row.answers.map((a) => [a.questionIndex, a]));
  const def = ASSESSMENTS[row.assessment_type ?? 'campaign_manager'];
  const totalSeconds = Math.round(def.times.reduce((a, b) => a + b, 0) * Number(row.time_multiplier));
  const done = row.status === 'completed';

  return (
    <>
      <TopBar left={<Link href={`/admin?type=${def.type}`} className="header-link">← All Candidates</Link>} />
      <main className="admin narrow">
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="title-md">{row.candidate_name}</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            {row.candidate_email} · {row.role} · {formatDate(row.started_at)} · Version {row.assessment_version}
            {row.privacy_notice_ack_at ? ' · Privacy notice confirmed' : ''}
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-value accent">{done ? row.overall_score : '—'}<small> / 100</small></div>
            <div className="stat-label">{done ? 'Score' : 'In Progress'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{formatDuration(row.completion_time_seconds)}</div>
            <div className="stat-label">Time Taken · Of {formatDuration(totalSeconds)}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{row.tab_leave_count}</div>
            <div className="stat-label">Tab Leaves</div>
          </div>
        </div>

        {!done && (
          <div className="row" style={{ gap: 12 }}>
            <span className="muted" style={{ fontWeight: 600 }}>Extra Time</span>
            <ExtraTimeSelect id={row.id} value={Number(row.time_multiplier)} />
          </div>
        )}
        {done && Number(row.time_multiplier) !== 1 && <p className="muted">Extra time: {extraTimeLabel(row.time_multiplier)}</p>}

        {done && row.category_scores && (
          <section className="stack">
            <h2 className="h2">Category Scores</h2>
            {def.categories.map((c) => (
              <div className="bar-row" key={c}>
                <span>{CATEGORY_LABELS[c]}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${row.category_scores![c] ?? 0}%` }} /></div>
                <strong>{row.category_scores![c] ?? 0}%</strong>
              </div>
            ))}
          </section>
        )}

        {questions.length > 0 && (
          <section className="stack" style={{ gap: 12 }}>
            <h2 className="h2">Answers</h2>
            {questions.map((q, i) => {
              const answer = answers.get(i);
              const score = questionScore(q, answer);
              const pending = !answer;
              const allowed = Math.round(q.timeLimitSeconds * Number(row.time_multiplier));
              const given = !answer
                ? '—'
                : !answer.selected.length
                  ? 'No answer (time ran out)'
                  : q.kind === 'ranking'
                    ? rankingAnswer(q, answer.selected)
                    : letterAnswer(q, answer.selected);
              const correct = q.kind === 'ranking' ? rankingAnswer(q, q.correct) : letterAnswer(q, q.correct);
              const result = q.kind === 'ranking' ? `${Math.round(score * 100)} / 100 Points` : score === 1 ? 'Correct' : 'Incorrect';
              return (
                <article className="review" key={i}>
                  <div className="review-head">
                    <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
                      <span className="review-title">Question {i + 1}</span>
                      <span className="muted">
                        {CATEGORY_LABELS[q.category]} · {answer ? `${Math.round(answer.timeTakenMs / 1000)}s of ${allowed}s` : `${allowed}s`}
                        {answer?.timedOut ? ' · Time ran out' : ''}
                      </span>
                    </div>
                    {!pending && (
                      <span className="result"><span className={`dot${score === 1 ? '' : ' bad'}`} />{result}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 500 }}>{q.prompt}</p>
                  <div className="answer-grid">
                    <div><span className="muted" style={{ fontSize: 14 }}>Candidate Answer</span><br /><strong className={q.kind === 'ranking' ? 'ranked' : undefined}>{given}</strong></div>
                    <div>
                      <span className="muted" style={{ fontSize: 14 }}>{q.kind === 'ranking' ? 'Ideal Order (Item 1 Must Lead)' : 'Correct Answer'}</span><br />
                      <strong className={q.kind === 'ranking' ? 'ranked' : undefined}>{correct}</strong>
                    </div>
                  </div>
                  <details>
                    <summary>Show The Question As The Candidate Saw It</summary>
                    <div className="stack">
                      <QuestionBlocks blocks={q.blocks} />
                      <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                        {q.options.map((o, j) => (
                          <li key={o.id}>
                            {q.kind === 'single' ? <strong>{LETTERS[j]}. </strong> : null}
                            {o.text}
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
