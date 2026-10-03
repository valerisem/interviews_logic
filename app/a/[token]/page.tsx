import { notFound } from 'next/navigation';
import { Assessment } from '@/components/Assessment';
import { candidateState, getByToken } from '@/lib/assessment';

export const dynamic = 'force-dynamic';

export default async function AssessmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await getByToken(token);
  if (!row) notFound();

  const state = await candidateState(row);
  const recruiterEmail = row.recruiter_email || process.env.RECRUITER_EMAIL || '';
  return <Assessment token={token} initial={state} recruiterEmail={recruiterEmail} />;
}
