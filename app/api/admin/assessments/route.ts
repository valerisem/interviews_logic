import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminSession';
import { deleteAssessments } from '@/lib/assessment';

const ID_RE = /^[0-9a-f-]{36}$/i;

/** Permanently delete several submissions at once: body { ids: string[] }. */
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids: unknown[] = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length || ids.length > 500 || !ids.every((id) => typeof id === 'string' && ID_RE.test(id))) {
    return NextResponse.json({ error: 'Nothing to delete.' }, { status: 400 });
  }
  try {
    await deleteAssessments(ids as string[]);
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not delete.' }, { status: 500 });
  }
}
