import { adminEmail } from '@/lib/adminSession';
import { candidateRoute } from '@/lib/api';
import { AnswerError, setPaused } from '@/lib/assessment';

// Test mode only: a signed-in admin pauses or resumes the timer on their own test attempt.
export const POST = candidateRoute(async (row, req) => {
  if (!(await adminEmail())) throw new AnswerError('Only test attempts can be paused.');
  const body = await req.json().catch(() => ({}));
  return setPaused(row, body.paused === true);
});
