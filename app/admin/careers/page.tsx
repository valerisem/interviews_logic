import Link from 'next/link';
import { CareersPage } from '@/components/careers/CareersPage';
import { TopBar } from '@/components/TopBar';
import { requireAdminPage } from '@/lib/adminSession';
import { careerRoles } from '@/lib/careers';

export const dynamic = 'force-dynamic';

export default async function AdminCareers() {
  const email = await requireAdminPage();
  const { roles, saved } = await careerRoles();
  return (
    <>
      <TopBar
        wide="xl"
        right={
          <span className="row" style={{ gap: 16, flexWrap: 'nowrap' }}>
            <Link href="/admin" className="header-link">Assessments</Link>
            <span className="muted" style={{ fontSize: 14 }}>{email}</span>
          </span>
        }
      />
      <CareersPage roles={roles} admin saved={saved} />
    </>
  );
}
