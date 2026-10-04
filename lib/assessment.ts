import 'server-only';
import { db } from './supabase';
import { ASSESSMENT_VERSION, generateAssessment, newSeed } from './questionBank';
import { scoreAssessment } from './scoring';
import type { AssessmentRow, PublicQuestion, Question, SubmittedAnswer } from './types';

/** Small allowance for network latency on the final answer before the deadline. */
const GRACE_MS = 3000;

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export type CandidateState =
  | { status: 'invited'; timeLimitSeconds: number; total: number }
  | { status: 'in_progress'; timeLimitSeconds: number; total: number; index: number; remainingSeconds: number; question: PublicQuestion }
  | { status: 'completed' };

export function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

export async function getByToken(token: string): Promise<AssessmentRow | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await db().from('candidate_assessments').select('*').eq('token', token).maybeSingle();
  if (error) throw error;
  return data as AssessmentRow | null;
}

function toPublic(q: Question): PublicQuestion {
  return {
    blocks: q.blocks,
    prompt: q.prompt,
    kind: q.kind,
    ...(q.kind === 'multi' ? { selectCount: q.selectCount } : {}),
    options: q.options,
  };
}

function deadlineMs(row: AssessmentRow): number {
  return new Date(row.started_at!).getTime() + row.time_limit_seconds * 1000;
}

function isExpired(row: AssessmentRow, now = Date.now()): boolean {
  return now > deadlineMs(row) + GRACE_MS;
}

/** Score and close an in-progress assessment. Safe to call more than once. */
async function finalize(row: AssessmentRow, answers: SubmittedAnswer[], timedOut: boolean): Promise<void> {
  const questions = row.questions ?? [];
  const { overallScore, correctCount, categoryScores } = scoreAssessment(questions, answers);
  const elapsed = Math.round((Date.now() - new Date(row.started_at!).getTime()) / 1000);
  const { error } = await db()
    .from('candidate_assessments')
    .update({
      status: 'completed',
      answers,
      completed_at: new Date().toISOString(),
      completion_time_seconds: Math.min(elapsed, row.time_limit_seconds),
      timed_out: timedOut,
      overall_score: overallScore,
      correct_count: correctCount,
      category_scores: categoryScores,
    })
    .eq('id', row.id)
    .eq('status', 'in_progress');
  if (error) throw error;
}

/** The candidate's current view. Closes the assessment if its time has run out. */
export async function candidateState(row: AssessmentRow): Promise<CandidateState> {
  const total = 12;
  if (row.status === 'invited') return { status: 'invited', timeLimitSeconds: row.time_limit_seconds, total };
  if (row.status === 'completed') return { status: 'completed' };

  const questions = row.questions ?? [];
  if (isExpired(row) || row.current_index >= questions.length) {
    await finalize(row, row.answers, isExpired(row));
    return { status: 'completed' };
  }
  return {
    status: 'in_progress',
    timeLimitSeconds: row.time_limit_seconds,
    total: questions.length,
    index: row.current_index,
    remainingSeconds: Math.max(0, Math.round((deadlineMs(row) - Date.now()) / 1000)),
    question: toPublic(questions[row.current_index]),
  };
}

/** Start the timer and generate this candidate's questions. */
export async function startAssessment(row: AssessmentRow): Promise<CandidateState> {
  if (row.status !== 'invited') return candidateState(row);

  let seed = 0;
  let questions: Question[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    seed = newSeed();
    try {
      questions = generateAssessment(seed);
      break;
    } catch {
      // A rare generator collision (e.g. duplicate option text): try another seed.
    }
  }
  if (!questions.length) throw new Error('Could not generate questions');

  const { data, error } = await db()
    .from('candidate_assessments')
    .update({
      status: 'in_progress',
      seed,
      questions,
      correct_answers: questions.map((q) => q.correct),
      answers: [],
      current_index: 0,
      started_at: new Date().toISOString(),
      assessment_version: ASSESSMENT_VERSION,
    })
    .eq('id', row.id)
    .eq('status', 'invited')
    .select('*')
    .maybeSingle();
  if (error) throw error;

  // If two Start requests raced, the loser re-reads the winner's row.
  const fresh = (data as AssessmentRow | null) ?? (await getByToken(row.token))!;
  return candidateState(fresh);
}

export class AnswerError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function defaultTimeLimitSeconds(): number {
  const minutes = Number(process.env.DEFAULT_TIME_LIMIT_MINUTES ?? 5);
  return Math.round((Number.isFinite(minutes) && minutes > 0 ? minutes : 5) * 60);
}

/** Self-enrolment from the public page: save the candidate's details and start the timer straight away. */
export async function enrolAndStart(input: { name?: unknown; email?: unknown; role?: unknown }) {
  const name = String(input.name ?? '').trim().slice(0, 120);
  const email = String(input.email ?? '').trim().toLowerCase().slice(0, 200);
  const role = String(input.role ?? '').trim().slice(0, 120);
  if (!name) throw new AnswerError('Please enter your name.');
  if (!EMAIL_RE.test(email)) throw new AnswerError('Please enter a valid email address.');
  if (!role) throw new AnswerError('Please enter the role you’re interviewing for.');

  // One attempt per email, so the questions can't be seen first and retaken.
  const { data: existing, error: lookupError } = await db()
    .from('candidate_assessments')
    .select('id')
    .eq('candidate_email', email)
    .limit(1);
  if (lookupError) throw lookupError;
  if (existing?.length) {
    throw new AnswerError('An assessment has already been started with this email. Please contact your recruiter if you need help.');
  }

  const { data, error } = await db()
    .from('candidate_assessments')
    .insert({
      token: newToken(),
      candidate_name: name,
      candidate_email: email,
      role,
      assessment_version: ASSESSMENT_VERSION,
      time_limit_seconds: defaultTimeLimitSeconds(),
    })
    .select('*')
    .single();
  if (error) throw error;

  const row = data as AssessmentRow;
  return { token: row.token, state: await startAssessment(row) };
}

/** Recruiter change to a candidate's time limit. Applies immediately, including mid-assessment. */
export async function updateTimeLimit(id: string, minutes: number): Promise<void> {
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
    throw new AnswerError('Time limit must be between 1 and 240 minutes.');
  }
  const { error } = await db()
    .from('candidate_assessments')
    .update({ time_limit_seconds: Math.round(minutes * 60) })
    .eq('id', id)
    .neq('status', 'completed');
  if (error) throw error;
}

/** Record the answer to the current question and move forward. There is no way back. */
export async function submitAnswer(row: AssessmentRow, questionIndex: number, selected: unknown): Promise<CandidateState> {
  if (row.status !== 'in_progress') return candidateState(row);
  const questions = row.questions ?? [];

  if (isExpired(row)) {
    await finalize(row, row.answers, true);
    return { status: 'completed' };
  }
  // Answers for anything other than the current question are ignored (no going back, no skipping ahead).
  if (questionIndex !== row.current_index) return candidateState(row);

  const question = questions[questionIndex];
  const validIds = new Set(question.options.map((o) => o.id));
  const need = question.kind === 'multi' ? question.selectCount! : 1;
  if (
    !Array.isArray(selected) ||
    selected.length !== need ||
    new Set(selected).size !== selected.length ||
    !selected.every((id) => typeof id === 'string' && validIds.has(id))
  ) {
    throw new AnswerError(need === 1 ? 'Please choose one answer.' : `Please choose ${need} answers.`);
  }

  const answers: SubmittedAnswer[] = [
    ...row.answers,
    { questionIndex, selected: selected as string[], answeredAt: new Date().toISOString() },
  ];
  const nextIndex = questionIndex + 1;

  const { data, error } = await db()
    .from('candidate_assessments')
    .update({ answers, current_index: nextIndex })
    .eq('id', row.id)
    .eq('status', 'in_progress')
    .eq('current_index', questionIndex)
    .select('*')
    .maybeSingle();
  if (error) throw error;

  const fresh = (data as AssessmentRow | null) ?? (await getByToken(row.token))!;
  if (data && nextIndex >= questions.length) {
    await finalize(fresh, answers, false);
    return { status: 'completed' };
  }
  return candidateState(fresh);
}

/** Score any assessment whose time ran out after the candidate closed the page. */
export async function closeExpiredAssessments(): Promise<void> {
  const { data, error } = await db().from('candidate_assessments').select('*').eq('status', 'in_progress');
  if (error) throw error;
  for (const row of (data ?? []) as AssessmentRow[]) {
    if (isExpired(row)) await candidateState(row);
  }
}

export async function recordTabLeave(token: string): Promise<void> {
  const { error } = await db().rpc('candidate_assessment_tab_leave', { p_token: token });
  if (error) throw error;
}
