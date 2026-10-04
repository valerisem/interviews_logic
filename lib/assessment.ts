import 'server-only';
import privacyNotice from '@/content/privacy-notice.json';
import { db } from './supabase';
import { ASSESSMENTS, isAssessmentType, newSeed } from './questionBank';
import { EXTRA_TIME_CHOICES } from './extraTime';
import { scoreAssessment } from './scoring';
import type { AssessmentRow, PublicQuestion, Question, SubmittedAnswer } from './types';

const TABLE = 'candidate_assessments';

/** Allowance for network latency on an answer sent as the timer runs out. */
const GRACE_MS = 3000;

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export type CandidateState =
  | {
      status: 'in_progress';
      index: number;
      total: number;
      /** Seconds left on the current question, and its full length (with any extra time). */
      remainingSeconds: number;
      questionSeconds: number;
      question: PublicQuestion;
      /** Test attempts only: the admin can pause the timer. */
      testMode: boolean;
      paused: boolean;
    }
  | { status: 'completed'; testMode: boolean };

export class AnswerError extends Error {}

export function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

export async function getByToken(token: string): Promise<AssessmentRow | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await db().from(TABLE).select('*').eq('token', token).maybeSingle();
  if (error) throw error;
  return data as AssessmentRow | null;
}

function toPublic(q: Question): PublicQuestion {
  return { blocks: q.blocks, prompt: q.prompt, kind: q.kind, options: q.options, ...(q.layout ? { layout: q.layout } : {}) };
}

function questionMs(row: AssessmentRow, i: number): number {
  return row.questions![i].timeLimitSeconds * Number(row.time_multiplier) * 1000;
}

/*
 * Test-mode pause, without extra columns: while paused, question_started_at holds
 * PAUSE_BASE + the time already used on the question. That lies far in the future,
 * so nothing expires, and resuming sets it back to now − time used.
 */
const PAUSE_BASE = Date.UTC(9000, 0, 1);

function startedAtMs(row: AssessmentRow): number {
  return new Date(row.question_started_at!).getTime();
}

function isPaused(row: AssessmentRow): boolean {
  return startedAtMs(row) >= PAUSE_BASE;
}

function remainingMs(row: AssessmentRow): number {
  const limit = questionMs(row, row.current_index);
  const used = isPaused(row) ? startedAtMs(row) - PAUSE_BASE : Date.now() - startedAtMs(row);
  return Math.max(0, limit - used);
}

function finalFields(row: AssessmentRow, answers: SubmittedAnswer[]) {
  const { questionScores, categoryScores, overallScore } = scoreAssessment(row.questions!, answers);
  const totalMs = answers.reduce((s, a) => s + a.timeTakenMs, 0);
  return {
    status: 'completed' as const,
    answers,
    question_scores: questionScores,
    category_scores: categoryScores,
    overall_score: overallScore,
    completed_at: new Date().toISOString(),
    completion_time_seconds: Math.round(totalMs / 1000),
  };
}

/**
 * Questions keep counting down when the candidate is away: any question whose
 * time has run out is recorded as unanswered, and the next one is treated as
 * having started when the previous one ended.
 */
async function catchUp(row: AssessmentRow): Promise<AssessmentRow> {
  if (row.status !== 'in_progress' || isPaused(row)) return row;
  const now = Date.now();
  const total = row.questions!.length;
  let index = row.current_index;
  let startedAt = new Date(row.question_started_at!).getTime();
  const answers = [...row.answers];
  while (index < total && now > startedAt + questionMs(row, index) + GRACE_MS) {
    const end = startedAt + questionMs(row, index);
    answers.push({ questionIndex: index, selected: [], answeredAt: new Date(end).toISOString(), timeTakenMs: questionMs(row, index), timedOut: true });
    index++;
    startedAt = end;
  }
  if (index === row.current_index) return row;

  const update =
    index >= total
      ? finalFields(row, answers)
      : { answers, current_index: index, question_started_at: new Date(startedAt).toISOString() };
  const { data, error } = await db()
    .from(TABLE)
    .update(update)
    .eq('id', row.id)
    .eq('status', 'in_progress')
    .eq('current_index', row.current_index)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return (data as AssessmentRow | null) ?? (await getByToken(row.token))!;
}

/** The candidate's current view. */
export async function candidateState(input: AssessmentRow): Promise<CandidateState> {
  const row = await catchUp(input);
  if (row.status !== 'in_progress') return { status: 'completed', testMode: isTestAttempt(row) };
  const q = row.questions![row.current_index];
  return {
    status: 'in_progress',
    index: row.current_index,
    total: row.questions!.length,
    remainingSeconds: remainingMs(row) / 1000,
    questionSeconds: questionMs(row, row.current_index) / 1000,
    question: toPublic(q),
    testMode: isTestAttempt(row),
    paused: isPaused(row),
  };
}

/** Public enrolment: save the candidate's details and start the first question straight away. */
/** Suffix on assessment_version marking an attempt taken by a signed-in admin in test mode. */
export const TEST_SUFFIX = '-TEST';
export const isTestAttempt = (row: Pick<AssessmentRow, 'assessment_version'>) => row.assessment_version?.endsWith(TEST_SUFFIX) ?? false;

/** testMode: a signed-in admin is testing, so the one-attempt rule is skipped and the row is marked as a test. */
export async function enrolAndStart(input: { name?: unknown; email?: unknown; assessmentType?: unknown; privacyAck?: unknown }, testMode = false) {
  const name = String(input.name ?? '').trim().slice(0, 120);
  const email = String(input.email ?? '').trim().toLowerCase().slice(0, 200);
  if (!name) throw new AnswerError('Please enter your name.');
  if (!EMAIL_RE.test(email)) throw new AnswerError('Please enter a valid email address.');
  if (!isAssessmentType(input.assessmentType)) throw new AnswerError('Please choose the role you’re interviewing for.');
  const assessment = ASSESSMENTS[input.assessmentType];
  if (input.privacyAck !== true) throw new AnswerError('Please confirm that you have read the Candidate Assessment Privacy Notice.');

  // One attempt per email, so the questions can't be previewed and retaken.
  if (!testMode) {
    const { data: existing, error: lookupError } = await db().from(TABLE).select('id').eq('candidate_email', email).limit(1);
    if (lookupError) throw lookupError;
    if (existing?.length) {
      throw new AnswerError('An assessment has already been started with this email. Please contact your recruiter if you need help.');
    }
  }

  let questions: Question[] = [];
  let seed = 0;
  for (let attempt = 0; attempt < 5 && !questions.length; attempt++) {
    seed = newSeed();
    try {
      questions = assessment.generate(seed);
    } catch {
      // Rare generator collision (e.g. duplicate option text): try another seed.
    }
  }
  if (!questions.length) throw new Error('Could not generate questions');

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from(TABLE)
    .insert({
      token: newToken(),
      candidate_name: name,
      candidate_email: email,
      role: assessment.role,
      assessment_type: assessment.type,
      assessment_version: testMode ? `${assessment.version}${TEST_SUFFIX}` : assessment.version,
      status: 'in_progress',
      seed,
      questions,
      correct_answers: questions.map((q) => q.correct),
      answers: [],
      current_index: 0,
      started_at: now,
      question_started_at: now,
      privacy_notice_version: privacyNotice.effectiveDate,
      privacy_notice_ack_at: now,
    })
    .select('*')
    .single();
  if (error) throw error;

  const row = data as AssessmentRow;
  return { token: row.token, state: await candidateState(row) };
}

/** Record the answer to the current question and move on. There is no way back. */
export async function submitAnswer(input: AssessmentRow, questionIndex: number, selected: unknown, timedOut: boolean): Promise<CandidateState> {
  const row = await catchUp(input);
  if (row.status !== 'in_progress') return { status: 'completed', testMode: isTestAttempt(row) };
  // Answers for anything other than the current question are ignored.
  if (questionIndex !== row.current_index) return candidateState(row);
  if (isPaused(row)) throw new AnswerError('Resume the assessment to continue.');

  const q = row.questions![questionIndex];
  const valid = new Set(q.options.map((o) => o.id));
  const list = Array.isArray(selected) ? selected : [];
  const ok =
    list.every((id) => typeof id === 'string' && valid.has(id)) &&
    new Set(list).size === list.length &&
    (q.kind === 'single' ? list.length <= 1 : list.length === 0 || list.length === q.options.length);
  if (!ok) throw new AnswerError('That answer could not be recorded. Please try again.');
  if (!timedOut && list.length === 0) {
    throw new AnswerError(q.kind === 'ranking' ? 'Please put the items in order.' : 'Please choose an answer.');
  }

  const startedAt = new Date(row.question_started_at!).getTime();
  const now = Date.now();
  const answers: SubmittedAnswer[] = [
    ...row.answers,
    {
      questionIndex,
      selected: list as string[],
      answeredAt: new Date(now).toISOString(),
      timeTakenMs: Math.min(now - startedAt, questionMs(row, questionIndex)),
      timedOut,
    },
  ];
  const last = questionIndex + 1 >= row.questions!.length;
  const update = last
    ? finalFields(row, answers)
    : { answers, current_index: questionIndex + 1, question_started_at: new Date(now).toISOString() };

  const { data, error } = await db()
    .from(TABLE)
    .update(update)
    .eq('id', row.id)
    .eq('status', 'in_progress')
    .eq('current_index', questionIndex)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  const fresh = (data as AssessmentRow | null) ?? (await getByToken(row.token))!;
  return candidateState(fresh);
}

/** Test attempts only (the route also requires an admin session): pause or resume the current question's timer. */
export async function setPaused(input: AssessmentRow, pause: boolean): Promise<CandidateState> {
  if (!isTestAttempt(input)) throw new AnswerError('Only test attempts can be paused.');
  const row = await catchUp(input);
  if (row.status !== 'in_progress' || isPaused(row) === pause) return candidateState(row);
  const used = questionMs(row, row.current_index) - remainingMs(row);
  const startedAt = pause ? PAUSE_BASE + used : Date.now() - used;
  const { data, error } = await db()
    .from(TABLE)
    .update({ question_started_at: new Date(startedAt).toISOString() })
    .eq('id', row.id)
    .eq('status', 'in_progress')
    .eq('current_index', row.current_index)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return candidateState((data as AssessmentRow | null) ?? (await getByToken(row.token))!);
}

/** Test mode (the route also requires an admin session): start a fresh attempt with the same details, optionally for the other role. */
export async function retakeTest(row: AssessmentRow, assessmentType?: unknown) {
  if (!isTestAttempt(row)) throw new AnswerError('Only test attempts can be retaken.');
  return enrolAndStart(
    {
      name: row.candidate_name,
      email: row.candidate_email,
      assessmentType: isAssessmentType(assessmentType) ? assessmentType : row.assessment_type,
      privacyAck: true,
    },
    true,
  );
}

/** Close any assessment whose remaining questions ran out after the candidate left. */
export async function closeExpiredAssessments(): Promise<void> {
  const { data, error } = await db().from(TABLE).select('*').eq('status', 'in_progress');
  if (error) throw error;
  for (const row of (data ?? []) as AssessmentRow[]) await catchUp(row);
}

/** Recruiter-set extra time (e.g. a reasonable adjustment). Applies from the current question onwards. */
export async function updateExtraTime(id: string, multiplier: number): Promise<void> {
  if (!EXTRA_TIME_CHOICES.some(([v]) => v === multiplier)) {
    throw new AnswerError('Choose None, +25%, +50% or +100%.');
  }
  const { error } = await db().from(TABLE).update({ time_multiplier: multiplier }).eq('id', id).neq('status', 'completed');
  if (error) throw error;
}

/** Permanently delete one submission (admin only; the route checks the session). */
export async function deleteAssessment(id: string): Promise<void> {
  const { error } = await db().from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function recordTabLeave(token: string): Promise<void> {
  const { error } = await db().rpc('candidate_assessment_tab_leave', { p_token: token });
  if (error) throw error;
}
