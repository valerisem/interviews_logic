import type { Metadata } from 'next';
import { CareersPage } from '@/components/careers/CareersPage';
import { TopBar } from '@/components/TopBar';
import { careerRoles } from '@/lib/careers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Careers · House of Marketers',
  description: 'Your future career awaits. See the open roles at House of Marketers.',
  openGraph: { title: 'Careers · House of Marketers', description: 'Your future career awaits. See the open roles at House of Marketers.', type: 'website' },
};

export default async function Careers() {
  const { roles } = await careerRoles();
  return (
    <>
      <TopBar wide="xl" />
      <CareersPage roles={roles} />
    </>
  );
}
