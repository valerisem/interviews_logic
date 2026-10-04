import { NextResponse } from 'next/server';
import { AnswerError, enrolAndStart } from '@/lib/assessment';

/** Public: a candidate enters name, email and role, confirms the privacy notice, and starts immediately. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await enrolAndStart(body);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof AnswerError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
