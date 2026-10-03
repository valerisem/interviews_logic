import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminSession';
import { AnswerError, updateTimeLimit } from '@/lib/assessment';

/** Change a candidate's time limit (e.g. a reasonable adjustment), before or during the assessment. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const body = await req.json().catch(() => ({}));
    await updateTimeLimit(id, Number(body.timeLimitMinutes));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AnswerError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Could not update the time limit.' }, { status: 500 });
  }
}
