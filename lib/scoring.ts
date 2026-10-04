import type { Category, CategoryScores, Question, SubmittedAnswer } from './types';

/**
 * Prioritisation scoring: full credit if the high-risk item is placed first, otherwise none.
 * The order of positions 2–4 is stored for recruiter review but does not affect the score.
 */
export function rankingScore(q: Question, order: string[]): number {
  const r = q.ranking;
  if (!r || order.length !== q.options.length) return 0;
  return order[0] === r.critical ? 1 : 0;
}

/** Score for one question, from 0 to 1. */
export function questionScore(q: Question, answer: SubmittedAnswer | undefined): number {
  if (!answer || !answer.selected.length) return 0;
  if (q.kind === 'ranking') return rankingScore(q, answer.selected);
  return answer.selected.length === 1 && answer.selected[0] === q.correct[0] ? 1 : 0;
}

/**
 * Accuracy only. Completion time is stored separately and not combined into the score.
 * Each category has one question, so its category score is that question's score.
 */
export function scoreAssessment(questions: Question[], answers: SubmittedAnswer[]) {
  const byIndex = new Map(answers.map((a) => [a.questionIndex, a]));
  const questionScores = questions.map((q, i) => questionScore(q, byIndex.get(i)));
  const sums = new Map<Category, { total: number; n: number }>();
  questions.forEach((q, i) => {
    const s = sums.get(q.category) ?? { total: 0, n: 0 };
    s.total += questionScores[i];
    s.n += 1;
    sums.set(q.category, s);
  });
  const categoryScores: CategoryScores = Object.fromEntries(
    [...sums].map(([c, s]) => [c, Math.round((s.total / s.n) * 100)]),
  );
  const overallScore = questions.length
    ? Math.round((questionScores.reduce((a, b) => a + b, 0) / questions.length) * 100)
    : 0;
  return { questionScores, categoryScores, overallScore };
}
