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
  laptop: <g><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></g>,
  stairs: <g><path d="M4 20h5v-5h5v-5h5V5" /><path d="m15 5h4v4" /></g>,
  calendar: <g><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9.5 15 2 2 3.5-4" /></g>,
  gift: <g><rect x="3" y="8" width="18" height="5" rx="1" /><path d="M5 13v8h14v-8M12 8v13" /><path d="M12 8c-1.5-3-5-3.5-5-1.5S10 8 12 8zM12 8c1.5-3 5-3.5 5-1.5S14 8 12 8z" /></g>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
};

type BenefitItem = (typeof BENEFITS)[number];
type Card = Extract<BenefitItem, { title: string }>;
const cards = BENEFITS.filter((b): b is Card => 'title' in b);
const photos = BENEFITS.filter((b): b is Extract<BenefitItem, { photo: string }> => 'photo' in b);

function BenefitCard({ b, style }: { b: Card; style?: React.CSSProperties }) {
  return (
    <article className={`cr-benefit ${b.tone}`} style={style}>
      {b.icon && (
        <span className="cr-bicon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[b.icon]}</svg>
        </span>
      )}
      <h3>{b.title}</h3>
      <p>{b.text}</p>
    </article>
  );
}

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
              <div className="cr-big">
                {h.big}
                <span className={`cr-tag ${h.tone}`}>{h.tag}</span>
              </div>
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
              <BenefitCard key={b.title} b={b} style={{ gridArea: b.area }} />
            ),
          )}
        </div>
        {/* Phones: a team photo, the benefits as a row you swipe through, then the other team photo. */}
        <div className="cr-benefits-phone">
          {photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cr-photo" src={photos[0].photo} alt={photos[0].alt} loading="lazy" />
          )}
          <div className="cr-swipe" aria-label="Benefits, swipe for more">
            {cards.map((b) => <BenefitCard key={b.title} b={b} />)}
          </div>
          <p className="cr-swipe-hint" aria-hidden="true">Swipe for more →</p>
          {photos[1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cr-photo" src={photos[1].photo} alt={photos[1].alt} loading="lazy" />
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
