import { NextResponse } from 'next/server';
import { adminEmail } from '@/lib/adminSession';
import { setRoleOpen } from '@/lib/careers';
import { JOB_SLUGS } from '@/lib/jobs';

/** Open or close a role on the public careers page. */
export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const email = await adminEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { slug } = await ctx.params;
  if (!JOB_SLUGS.includes(slug)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.open !== 'boolean') return NextResponse.json({ error: 'Expected { open: boolean }' }, { status: 400 });
  try {
    await setRoleOpen(slug, body.open);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not save. Does this role have a row in the roles table with this job_slug?' }, { status: 500 });
  }
}
