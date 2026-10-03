import { candidateRoute } from '@/lib/api';
import { candidateState } from '@/lib/assessment';

// Called by the browser when its countdown reaches zero. The server only closes
// the assessment if its own deadline has actually passed.
export const POST = candidateRoute((row) => candidateState(row));
