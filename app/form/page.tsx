import { Assessment } from '@/components/Assessment';
import { adminEmail } from '@/lib/adminSession';

export const dynamic = 'force-dynamic';

/** The one public assessment link: candidates enter their details and start straight away. */
export default async function Home() {
  const testMode = (await adminEmail()) !== null;
  return <Assessment initial={{ status: 'enrol' }} testMode={testMode} />;
}
