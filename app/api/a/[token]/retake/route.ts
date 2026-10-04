import { adminEmail } from '@/lib/adminSession';
import { candidateRoute } from '@/lib/api';
import { AnswerError, retakeTest } from '@/lib/assessment';

// Test mode only: a signed-in admin starts a fresh attempt with the same name and email.
export const POST = candidateRoute(async (row, req) => {
  if (!(await adminEmail())) throw new AnswerError('Only test attempts can be retaken.');
  const body = await req.json().catch(() => ({}));
  return retakeTest(row, body.assessmentType);
});
