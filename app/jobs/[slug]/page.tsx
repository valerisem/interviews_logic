import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { JOB_SLUGS, getJob } from '@/lib/jobs';

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
      <TopBar />
      <main className="doc job">
        <header className="doc-head">
          <p className="eyebrow">We’re Hiring</p>
          <h1 className="title-md">
            {job.title} <span className="accent">{job.titleAccent}</span>
          </h1>
          <dl className="job-details">
            {job.details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="job-section">
          <h2>About House of Marketers</h2>
          {job.about.map((p) => <p key={p.slice(0, 24)} className="job-text">{p}</p>)}
        </section>

        <section className="job-section">
          <h2>What You Will Own</h2>
          <div className="job-cards">
            {job.own.map(([title, text]) => (
              <article key={title} className="job-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="job-section">
          <h2>How We Work</h2>
          <div className="job-cards three">
            {job.howWeWork.map(([title, text], i) => (
              <article key={title} className="job-card">
                <span className="job-num">{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="job-lists">
          <section className="job-section">
            <h2>What We Are Looking For</h2>
            <ul className="job-list">{job.lookingFor.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section className="job-section">
            <h2>What Success Looks Like</h2>
            <p className="job-text">{job.successIntro}</p>
            <ul className="job-list">{job.success.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>
      </main>
    </>
  );
}
