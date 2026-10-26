import Link from 'next/link';
import { Fragment } from 'react';
import { OrgChart } from '@/components/OrgChart';
import { ABOUT, BENEFITS, HISTORY, ROLE_PAGES, VALUES, type BenefitIcon, type CareerPerson, type CareerRole } from '@/lib/careers';
import { ORG_CHARTS } from '@/lib/jobs';
import { AssembleOnScroll } from './AssembleOnScroll';
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
  laptop: <g><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></g>,
  stairs: <g><path d="M4 20h5v-5h5v-5h5V5" /><path d="m15 5h4v4" /></g>,
  calendar: <g><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9.5 15 2 2 3.5-4" /></g>,
  gift: <g><rect x="3" y="8" width="18" height="5" rx="1" /><path d="M5 13v8h14v-8M12 8v13" /><path d="M12 8c-1.5-3-5-3.5-5-1.5S10 8 12 8zM12 8c1.5-3 5-3.5 5-1.5S14 8 12 8z" /></g>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
};

/*
 * One-line drawings for the values, in the spirit of the reference posters: a single line drifts in
 * from the left and becomes the drawing. Same order as VALUES.
 */
const VALUE_ART = [
  // Proactivity: a rocket taking off
  <g key="rocket"><path d="M2 66c12-6 16 4 26-2 8-5 4-12-2-10-6 2-2 10 10 8 6-1 10-8 14-12" /><path d="M50 50c2-12 12-26 30-36-4 18-16 30-26 38z" /><circle cx="68" cy="27" r="3.2" /><path d="M53 36h-8l-4 8 9 2M59 49v8l-8 4v-9" /></g>,
  // Intelligent curiosity: a lightbulb switching on
  <g key="bulb"><path d="M2 60c12-6 22 6 34 0s12-4 14-8" /><path d="M50 52v-6c-8-5-10-13-8-19 3-9 10-13 16-13s13 4 16 13c2 6 0 14-8 19v6z" /><path d="M51 58h14M58 4v5M44 9l3 4M72 9l-3 4M37 20l4 2M79 20l-4 2" /></g>,
  // Ownership: planting a flag
  <g key="flag"><path d="M2 60c14-4 22 4 34 0s10 0 14 0h32" /><path d="M50 60V12c8-4 14 4 24 0v18c-10 4-16-4-24 0" /></g>,
  // First principles: building up from the base
  <g key="layers"><path d="M2 54c12-6 18 4 28-2" /><path d="M56 18l24 12-24 12-24-12z" /><path d="M32 38l24 12 24-12M32 46l24 12 24-12" /></g>,
  // Speed: a lightning bolt
  <g key="bolt"><path d="M2 56c12-6 20 6 32 0" /><path d="M62 6 44 38h14l-6 28 26-36H64l8-24z" /><path d="M20 24h14M16 32h12" /></g>,
  // AI with judgement: sparkles
  <g key="spark"><path d="M2 62c14-4 20 6 28-4 4-6 0-18 6-26" /><path d="M56 12c2 14 6 18 20 20-14 2-18 6-20 20-2-14-6-18-20-20 14-2 18-6 20-20z" /><path d="M76 48c1 6 2 7 8 8-6 1-7 2-8 8-1-6-2-7-8-8 6-1 7-2 8-8z" /></g>,
];

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
      {b.tags && (
        <div className="cr-places" aria-label={`Our team works from ${b.tags.join(', ')}`}>
          {[0, 1, 2].map((row) => {
            const part = b.tags!.filter((_, i) => i % 3 === row);
            return (
              <div key={row} className={`cr-places-row${row === 1 ? ' back' : ''}`} aria-hidden="true">
                {[...part, ...part].map((t, i) => <span key={i}>{t}</span>)}
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export function CareersPage({ roles, people, admin, saved }: { roles: CareerRole[]; people: CareerPerson[]; admin?: boolean; saved?: boolean }) {
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
          <span>Only you can see the org chart and the open / closed switches. Closed roles are hidden from everyone else.</span>
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
          <div className="cr-value-list">
            {VALUES.map((v, i) => (
              <article key={v.title}>
                <svg className="cr-value-art" viewBox="0 0 88 72" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {VALUE_ART[i % VALUE_ART.length]}
                </svg>
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
        <PeopleMarquee people={people} />
      </section>

      <section className="cr-section" id="benefits">
        <div className="cr-head">
          <h2>Our <span className="accent">benefits</span></h2>
        </div>
        <AssembleOnScroll className="cr-benefits">
          {BENEFITS.map((b) =>
            'photo' in b ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.photo} className="cr-photo" src={b.photo} alt={b.alt} loading="lazy" style={{ gridArea: b.area }} />
            ) : (
              <BenefitCard key={b.title} b={b} style={{ gridArea: b.area }} />
            ),
          )}
        </AssembleOnScroll>
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
          {admin && !saved && <p className="cr-warn">Could not read the roles table, so every role shows as open and the switches may not save.</p>}
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
