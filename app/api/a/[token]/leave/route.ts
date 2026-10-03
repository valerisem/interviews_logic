import { candidateRoute } from '@/lib/api';
import { recordTabLeave } from '@/lib/assessment';

export const POST = candidateRoute(async (row) => {
  if (row.status === 'in_progress') await recordTabLeave(row.token);
  return { ok: true };
});
