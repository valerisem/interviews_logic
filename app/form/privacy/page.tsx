import type { Metadata } from 'next';
import Link from 'next/link';
import notice from '@/content/privacy-notice.json';
import { TopBar } from '@/components/TopBar';

export const metadata: Metadata = { title: 'Privacy Notice · House of Marketers' };

const anchor = (title: string) => `s-${title.split('.')[0]}`;

export default function PrivacyNotice() {
  return (
    <>
      <TopBar left={<Link href="/form" className="header-link">← Back To Assessment</Link>} />
      <main className="doc">
        <header className="doc-head">
          <h1 className="title-md">Candidate Assessment <span className="accent">Privacy Notice</span></h1>
          <p className="muted" style={{ fontSize: 14 }}>Effective date: {notice.effectiveDate}</p>
          <p className="doc-intro">{notice.intro}</p>
        </header>

        <div className="doc-grid">
          <nav className="doc-toc" aria-label="Contents">
            <p className="doc-toc-title">Contents</p>
            <ol>
              {notice.sections.map((s) => (
                <li key={s.title}>
                  <a href={`#${anchor(s.title)}`}>{s.title.replace(/^\d+\.\s*/, '')}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="doc-body">
            {notice.sections.map((s) => (
              <section key={s.title} id={anchor(s.title)} className="doc-section">
                <h2>{s.title}</h2>
                {s.blocks.map((b, i) =>
                  Array.isArray(b) ? (
                    <ul key={i}>{b.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : (
                    <p key={i}>{b}</p>
                  ),
                )}
              </section>
            ))}
            <p className="footer">{notice.footer}</p>
          </div>
        </div>
      </main>
    </>
  );
}
