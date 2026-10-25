import type { Metadata } from 'next';
import Link from 'next/link';
import { CareersPage } from '@/components/careers/CareersPage';
import { TopBar } from '@/components/TopBar';
import { adminEmail } from '@/lib/adminSession';
import { careerRoles } from '@/lib/careers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Careers · House of Marketers',
  description: 'Your future career awaits. See the open roles at House of Marketers.',
  openGraph: { title: 'Careers · House of Marketers', description: 'Your future career awaits. See the open roles at House of Marketers.', type: 'website' },
};

/** One careers page: everyone sees it; a signed-in admin also gets the org chart and the open / closed switches. */
export default async function Careers() {
  const email = await adminEmail();
  const { roles, saved } = await careerRoles();
  return (
    <>
      <TopBar
        wide="xl"
        right={
          email ? (
            <span className="row" style={{ gap: 16, flexWrap: 'nowrap' }}>
              <Link href="/admin" className="header-link">Assessments</Link>
              <form method="post" action="/api/admin/logout">
                <button type="submit" className="header-link" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--heading)' }}>Sign Out</button>
              </form>
            </span>
          ) : (
            <Link href="/admin/login?next=/careers" className="header-link">Admin</Link>
          )
        }
      />
      <CareersPage roles={roles} admin={!!email} saved={saved} />
    </>
  );
}
