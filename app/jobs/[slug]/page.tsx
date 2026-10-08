import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { TopBar } from '@/components/TopBar';
import { JOB_SLUGS, getJob, jobSummary, type Job, type JobBlock, type JobSection } from '@/lib/jobs';

export function generateStaticParams() {
  return JOB_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const job = getJob((await params).slug);
  if (!job) return {};
  const title = `${job.title} ${job.titleAccent} · House of Marketers`;
  const description = jobSummary(job);
  return { title, description, openGraph: { title, description, type: 'website' } };
}

/** **text** is highlighted in the brand colour. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('**') ? <strong key={i} className="hl">{part.slice(2, -2)}</strong> : part,
      )}
    </>
  );
}

function Blocks({ blocks, textClass }: { blocks: JobBlock[]; textClass?: string }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (typeof b === 'string') {
          return b.split('\n\n').map((para, j) => (
            <p key={`${i}-${j}`} className={textClass}>
              <Inline text={para} />
            </p>
          ));
        }
        if ('list' in b) {
          return (
            <ul key={i} className={`job-list${b.list.length > 6 ? ' two-col' : ''}`}>
              {b.list.map((item) => <li key={item}><Inline text={item} /></li>)}
            </ul>
          );
        }
        if ('questions' in b) {
          return (
            <ul key={i} className="job-lines">
              {b.questions.map((q) => <li key={q}>{q}</li>)}
            </ul>
          );
        }
        if ('flow' in b) {
          return (
            <p key={i} className="job-flow">
              {b.flow.map((step, j) => (
                <Fragment key={step}>
                  {j > 0 && <span className="arrow" aria-label="then">→</span>}
                  <span className="step">{step}</span>
                </Fragment>
              ))}
            </p>
          );
        }
        return (
          <div key={i} className="job-shift">
            <p className="from">{b.shift[0]}</p>
            <p className="to-label">to:</p>
            <p className="to">{b.shift[1]}</p>
          </div>
        );
      })}
    </>
  );
}

/** Line icons for value cards, in order. */
const ICONS = [
  <path key="a" d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  <g key="b"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.6-4.6" /></g>,
  <g key="c"><circle cx="7.5" cy="15.5" r="5" /><path d="m11 12 10-10" /><path d="m16 7 3 3" /><path d="m19 4 2 2" /></g>,
  <g key="d"><path d="m12 2 10 5-10 5L2 7z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></g>,
  <g key="e"><path d="M13 19V5l9 7z" /><path d="M2 19V5l9 7z" /></g>,
  <g key="f"><path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8z" /><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></g>,
];

const itemId = (section: JobSection, i: number) => `${section.id}-${i + 1}`;

function Section({ job, section }: { job: Job; section: JobSection }) {
  const body = (
    <section id={section.id} className="job-section">
      <h2>{section.title}</h2>
      {section.blocks && <Blocks blocks={section.blocks} textClass="job-text" />}

      {section.layout === 'cards' && (
        <div className="job-cards">
          {section.items?.map((it) => (
            <article key={it.title} className="job-card">
              <h3>{it.title}</h3>
              <Blocks blocks={it.blocks} />
            </article>
          ))}
        </div>
      )}

      {section.layout === 'values' && (
        <div className="job-cards three">
          {section.items?.map((it, i) => (
            <article key={it.title} className="value-card">
              <span className="value-icon" aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {ICONS[i % ICONS.length]}
                </svg>
              </span>
              <h3>{it.title}</h3>
              <Blocks blocks={it.blocks} />
            </article>
          ))}
        </div>
      )}

      {section.layout === 'numbered' && (
        <div className="job-numbered">
          {section.items?.map((it, i) => (
            <article key={it.title} id={itemId(section, i)} className="job-card numbered">
              <div className="numbered-head">
                <span className="job-num">{i + 1}</span>
                <h3>{it.title}</h3>
              </div>
              <Blocks blocks={it.blocks} />
            </article>
          ))}
        </div>
      )}
    </section>
  );

  if (section.aside !== 'details') return body;
  return (
    <div className="job-intro">
      {body}
      <dl className="job-details">
        {job.details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const job = getJob((await params).slug);
  if (!job) notFound();

  // Consecutive half-width sections are shown side by side.
  const groups: JobSection[][] = [];
  for (const s of job.sections) {
    const last = groups[groups.length - 1];
    if (s.half && last?.length === 1 && last[0].half) last.push(s);
    else groups.push([s]);
  }

  return (
    <>
      <TopBar wide="xl" />
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
              {job.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                  {s.layout === 'numbered' && (
                    <ol className="doc-toc-sub">
                      {s.items?.map((it, i) => (
                        <li key={it.title}>
                          <a href={`#${itemId(s, i)}`}>{it.title}</a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="job-body">
            {groups.map((g) =>
              g.length === 2 ? (
                <div key={g[0].id} className="job-lists">
                  {g.map((s) => <Section key={s.id} job={job} section={s} />)}
                </div>
              ) : (
                <Section key={g[0].id} job={job} section={g[0]} />
              ),
            )}
          </div>
        </div>
      </main>
    </>
  );
}
