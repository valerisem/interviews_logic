import { candidateRoute } from '@/lib/api';
import { submitAnswer } from '@/lib/assessment';

export const POST = candidateRoute(async (row, req) => {
  const body = await req.json().catch(() => ({}));
  return submitAnswer(row, Number(body.questionIndex), body.selected, body.timedOut === true);
});
