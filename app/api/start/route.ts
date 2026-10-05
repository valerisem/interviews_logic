import { NextResponse } from 'next/server';
import { adminEmail } from '@/lib/adminSession';
import { AnswerError, enrolAndStart } from '@/lib/assessment';
import { TooManyStarts, checkStart, clientIp, recordStart } from '@/lib/botChecks';

/**
 * Public: a candidate enters name, email and role, confirms the privacy notice, and starts immediately.
 * A signed-in admin starts in test mode: repeat attempts allowed, marked as tests on the dashboard.
 * Everyone else goes through the invisible bot checks in lib/botChecks.ts first.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const testMode = (await adminEmail()) !== null;
    const ip = clientIp(req);
    if (!testMode) checkStart(body, ip);
    const result = await enrolAndStart(body, testMode);
    if (!testMode) recordStart(ip);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof TooManyStarts) return NextResponse.json({ error: e.message }, { status: 429 });
    if (e instanceof AnswerError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
