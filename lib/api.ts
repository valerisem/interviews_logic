import 'server-only';
import { NextResponse } from 'next/server';
import { AnswerError, getByToken } from './assessment';
import type { AssessmentRow } from './types';

/** Wraps a candidate API handler: resolves the token and turns errors into JSON responses. */
export function candidateRoute(handler: (row: AssessmentRow, req: Request) => Promise<unknown>) {
  return async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
    try {
      const { token } = await ctx.params;
      const row = await getByToken(token);
      if (!row) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
      const result = await handler(row, req);
      return NextResponse.json(result ?? { ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (e) {
      if (e instanceof AnswerError) return NextResponse.json({ error: e.message }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
  };
}
