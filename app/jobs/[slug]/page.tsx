import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { JOB_SLUGS, getJob } from '@/lib/jobs';

/** Paragraphs are separated by a blank line; **text** is highlighted in the brand colour. */
function Rich({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split('\n\n').map((para, i) => (
        <p key={i} className={className}>
          {para.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            part.startsWith('**') ? <strong key={j} className="hl">{part.slice(2, -2)}</strong> : part,
          )}
        </p>
      ))}
    </>
  );
}

const CONTENTS = [
  ['about', 'About House of Marketers'],
  ['own', 'What You Will Own'],
  ['how', 'How We Work'],
  ['looking-for', 'What We Are Looking For'],
  ['success', 'What Success Looks Like'],
];

/** Line icons for the How We Work principles, in order. */
const ICONS = [
  // Be proactive: lightning
  <path key="a" d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  // Be intelligently curious: magnifying glass
  <g key="b"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.6-4.6" /></g>,
  // Take ownership: key
  <g key="c"><circle cx="7.5" cy="15.5" r="5" /><path d="m11 12 10-10" /><path d="m16 7 3 3" /><path d="m19 4 2 2" /></g>,
  // Think from first principles: layers
  <g key="d"><path d="m12 2 10 5-10 5L2 7z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></g>,
  // Move fast: fast-forward
  <g key="e"><path d="M13 19V5l9 7z" /><path d="M2 19V5l9 7z" /></g>,
  // Use AI with judgement: sparkles
  <g key="f"><path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8z" /><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></g>,
];

export function generateStaticParams() {
  return JOB_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const job = getJob((await params).slug);
  if (!job) return {};
  const title = `${job.title} ${job.titleAccent} · House of Marketers`;
  const description = job.about[1] ?? job.about[0];
  return { title, description, openGraph: { title, description, type: 'website' } };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const job = getJob((await params).slug);
  if (!job) notFound();

  return (
    <>
      <TopBar wide />
      <main className="doc job">
        <header className="doc-head">
          <p className="eyebrow">We’re Hiring</p>
          <h1 className="title-md">
            {job.title} <span className="accent">{job.titleAccent}</span>
          </h1>
        </header>

        <div className="doc-grid">
          <nav className="doc-toc" aria-label="Contents">
            <p className="doc-toc-title">Contents</p>
            <ol>
              {CONTENTS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="job-body">
          <div className="job-intro">
            <section id="about" className="job-section">
              <h2>About House of Marketers</h2>
              {job.about.map((p) => <Rich key={p.slice(0, 24)} text={p} className="job-text" />)}
            </section>
            <dl className="job-details">
              {job.details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <section id="own" className="job-section">
            <h2>What You Will Own</h2>
            <div className="job-cards">
              {job.own.map(([title, text]) => (
                <article key={title} className="job-card">
                  <h3>{title}</h3>
                  <Rich text={text} />
                </article>
              ))}
            </div>
          </section>

          <section id="how" className="job-section how">
            <h2>How We Work</h2>
            <div className="job-cards three">
              {job.howWeWork.map(([title, text], i) => (
                <article key={title} className="value-card">
                  <span className="value-icon" aria-hidden="true">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {ICONS[i % ICONS.length]}
                    </svg>
                  </span>
                  <h3>{title}</h3>
                  <Rich text={text} />
                </article>
              ))}
            </div>
          </section>

          <div className="job-lists">
            <section id="looking-for" className="job-section">
              <h2>What We Are Looking For</h2>
              <ul className="job-list">{job.lookingFor.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section id="success" className="job-section">
              <h2>What Success Looks Like</h2>
              <p className="job-text">{job.successIntro}</p>
              <ul className="job-list">{job.success.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>
          </div>
        </div>
      </main>
    </>
  );
}
