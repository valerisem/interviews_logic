import { Assessment } from '@/components/Assessment';

export const dynamic = 'force-dynamic';

/** The one public assessment link: candidates enter their details and start straight away. */
export default function Home() {
  return <Assessment initial={{ status: 'enrol' }} />;
}
