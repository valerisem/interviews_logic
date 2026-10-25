import Link from 'next/link';
import { Fragment } from 'react';
import { OrgChart } from '@/components/OrgChart';
import { ABOUT, BENEFITS, HISTORY, PEOPLE, ROLE_PAGES, VALUES, VALUES_HEADLINE, type BenefitIcon, type CareerRole } from '@/lib/careers';
import { ORG_CHARTS } from '@/lib/jobs';
import { PeopleMarquee } from './PeopleMarquee';
import { RoleToggle } from './RoleToggle';

/*
 * The careers page. Everyone sees the open roles; the admin copy also shows the org chart (cards with a
 * job page open it) and a switch on every role to open or close it on the public page.
 */

/** **text** is highlighted in the brand colour. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('**') ? <strong key={i} className="hl">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

const ICONS: Record<BenefitIcon, React.ReactNode> = {
  globe: <g><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></g>,
  trophy: <g><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9.5 17h5" /></g>,
  stairs: <g><path d="M4 20h5v-5h5v-5h5V5" /><path d="m15 5h4v4" /></g>,
  chat: <g><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /></g>,
  spark: <g><path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8z" /><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></g>,
  target: <g><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></g>,
  brands: <g><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></g>,
};

export function CareersPage({ roles, admin, saved }: { roles: CareerRole[]; admin?: boolean; saved?: boolean }) {
  const shown = admin ? roles : roles.filter((r) => r.open);
  const org = ORG_CHARTS['head-of-operations'];
  const links = admin && org
    ? Object.fromEntries(org.nodes.filter((n) => ROLE_PAGES[n.role]).map((n) => [n.id, `/jobs/${ROLE_PAGES[n.role]}`]))
    : undefined;

  return (
    <main className="careers">
      {admin && (
        <div className="cr-admin-bar">
          <b>Admin view</b>
          <span>Closed roles are hidden from the public careers page.</span>
          <Link href="/careers" target="_blank">Open public page ↗</Link>
        </div>
      )}

      <section className="cr-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="cr-hero-bg" src="/careers/office.jpg" alt="" />
        <div className="cr-hero-box">
          <p className="eyebrow">Careers at House of Marketers</p>
          <h1>Your Future Career <span className="accent">Awaits.</span></h1>
          <p className="cr-lead">Join the people building the next stage of House of Marketers.</p>
          <div className="cr-hero-cta">
            <a href="#roles" className="btn btn-primary">See open roles</a>
            <a href="#people" className="btn btn-secondary">Meet our people</a>
          </div>
        </div>
      </section>

      {admin && org && (
        <section className="cr-section cr-org" aria-label="Org chart">
          <div className="cr-head">
            <p className="eyebrow">Admin</p>
            <h2>Org Chart</h2>
            <p>Click a card marked “View role” to open its job page.</p>
          </div>
          <div className="job-org">
            <OrgChart data={org} links={links} />
          </div>
        </section>
      )}

      <section className="cr-section cr-about" id="about">
        <h2>About us</h2>
        <div>{ABOUT.map((p) => <p key={p}><Inline text={p} /></p>)}</div>
      </section>

      <section className="cr-story" id="values" aria-label="Our History & Values">
        <div className="cr-history">
          <p className="cr-kicker">Our History</p>
          {HISTORY.map((h) => (
            <div key={h.big} className="cr-year">
              <div className="cr-big">{h.big}</div>
              <p>{h.text}</p>
            </div>
          ))}
        </div>
        <div className="cr-values">
          <p className="cr-kicker">Our Values</p>
          <h2>{VALUES_HEADLINE}</h2>
          <div className="cr-value-list">
            {VALUES.map((v) => (
              <article key={v.title}>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cr-section cr-people" id="people">
        <div className="cr-head">
          <h2>Meet a few of our <span className="accent">people</span></h2>
          <p>Our philosophy is simple: hire exceptional people and give them the opportunity to make a real impact every day.</p>
        </div>
        <PeopleMarquee people={PEOPLE} />
      </section>

      <section className="cr-section" id="benefits">
        <div className="cr-head">
          <h2>Our <span className="accent">benefits</span></h2>
        </div>
        <div className="cr-benefits">
          {BENEFITS.map((b) =>
            'photo' in b ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.photo} className="cr-photo" src={b.photo} alt={b.alt} loading="lazy" style={{ gridArea: b.area }} />
            ) : (
              <article key={b.title} className={`cr-benefit ${b.tone}`} style={{ gridArea: b.area }}>
                {b.icon && (
                  <span className="cr-bicon" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[b.icon]}</svg>
                  </span>
                )}
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="cr-cta">
        <h2>Sounds good?</h2>
        <a href="#roles" className="btn btn-primary">See our open roles ↓</a>
      </section>

      <section className="cr-section cr-roles" id="roles">
        <div className="cr-head">
          <h2>Open <span className="accent">roles</span></h2>
          {admin && !saved && <p className="cr-warn">Opening and closing roles needs the job_openings table in the database. Every role shows as open until it exists.</p>}
        </div>
        {shown.length === 0 ? (
          <p className="cr-empty">There are no open roles right now. Check back soon.</p>
        ) : (
          <ul className="cr-role-list">
            {shown.map((r) => (
              <li key={r.slug} className={r.open ? undefined : 'closed'}>
                <Link href={`/jobs/${r.slug}`} className="cr-role">
                  <span className="cr-role-title">{r.title}</span>
                  <span className="cr-role-meta">
                    {r.team && <span>{r.team}</span>}
                    {r.location && <span>{r.location}</span>}
                  </span>
                  <span className="cr-role-go">View role →</span>
                </Link>
                {admin && <RoleToggle slug={r.slug} title={r.title} open={r.open} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
