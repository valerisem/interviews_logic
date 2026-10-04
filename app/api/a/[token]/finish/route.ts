import { candidateRoute } from '@/lib/api';
import { candidateState } from '@/lib/assessment';

// Returns the current state, recording any questions whose time has run out.
export const POST = candidateRoute((row) => candidateState(row));
