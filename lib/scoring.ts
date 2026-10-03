import { CATEGORIES, type CategoryScores, type Question, type SubmittedAnswer } from './types';

export function isCorrect(question: Question, answer: SubmittedAnswer | undefined): boolean {
  if (!answer) return false;
  const given = [...answer.selected].sort();
  const correct = [...question.correct].sort();
  return given.length === correct.length && given.every((id, i) => id === correct[i]);
}

/**
 * Accuracy only: each question is worth one mark, scaled to 100. Completion time
 * is stored separately and deliberately not combined into this score.
 */
export function scoreAssessment(questions: Question[], answers: SubmittedAnswer[]) {
  const byIndex = new Map(answers.map((a) => [a.questionIndex, a]));
  const categoryScores = Object.fromEntries(
    CATEGORIES.map((c) => [c, { correct: 0, total: 0, score: 0 }]),
  ) as CategoryScores;

  let correctCount = 0;
  questions.forEach((q, i) => {
    const ok = isCorrect(q, byIndex.get(i));
    const cat = categoryScores[q.category];
    cat.total += 1;
    if (ok) {
      cat.correct += 1;
      correctCount += 1;
    }
  });
  for (const c of CATEGORIES) {
    const s = categoryScores[c];
    s.score = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  }

  return {
    correctCount,
    overallScore: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
    categoryScores,
  };
}
