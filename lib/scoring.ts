import { CATEGORIES, type CategoryScores, type Question, type SubmittedAnswer } from './types';

/**
 * Prioritisation scoring (0–1), weighted rather than one rigid order:
 * - 60% for putting the high-risk item first (15% if it is second, nothing lower);
 * - 40% for how well the other three follow their relative urgency, where items of
 *   equal urgency may go in either order. If the high-risk item is not first, this
 *   part is scaled down to a quarter, so e.g. putting an internal report first scores low.
 */
export function rankingScore(q: Question, order: string[]): number {
  const r = q.ranking;
  if (!r || order.length !== q.options.length) return 0;
  const pos = order.indexOf(r.critical);
  const criticalPart = pos === 0 ? 0.6 : pos === 1 ? 0.15 : 0;
  const rest = order.filter((id) => id !== r.critical);
  let pairs = 0;
  let agree = 0;
  for (let i = 0; i < rest.length; i++) {
    for (let j = i + 1; j < rest.length; j++) {
      pairs++;
      if (r.urgency[rest[i]] >= r.urgency[rest[j]]) agree++;
    }
  }
  const restPart = 0.4 * (pairs ? agree / pairs : 1) * (pos === 0 ? 1 : 0.25);
  return Math.round((criticalPart + restPart) * 100) / 100;
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
  const sums = Object.fromEntries(CATEGORIES.map((c) => [c, { total: 0, n: 0 }])) as Record<string, { total: number; n: number }>;
  questions.forEach((q, i) => {
    sums[q.category].total += questionScores[i];
    sums[q.category].n += 1;
  });
  const categoryScores = Object.fromEntries(
    CATEGORIES.map((c) => [c, sums[c].n ? Math.round((sums[c].total / sums[c].n) * 100) : 0]),
  ) as CategoryScores;
  const overallScore = questions.length
    ? Math.round((questionScores.reduce((a, b) => a + b, 0) / questions.length) * 100)
    : 0;
  return { questionScores, categoryScores, overallScore };
}
