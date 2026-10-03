import { candidateRoute } from '@/lib/api';
import { startAssessment } from '@/lib/assessment';

export const POST = candidateRoute((row) => startAssessment(row));
