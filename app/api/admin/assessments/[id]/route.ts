import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminSession';
import { AnswerError, deleteAssessment, updateExtraTime } from '@/lib/assessment';

/** Set a candidate's extra time (a reasonable adjustment). The reason is never recorded. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const body = await req.json().catch(() => ({}));
    await updateExtraTime(id, Number(body.timeMultiplier));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AnswerError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Could not update extra time.' }, { status: 500 });
  }
}

/** Permanently delete a submission. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    await deleteAssessment(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not delete.' }, { status: 500 });
  }
}
