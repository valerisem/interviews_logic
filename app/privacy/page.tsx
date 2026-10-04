import type { Metadata } from 'next';
import Link from 'next/link';
import notice from '@/content/privacy-notice.json';
import { TopBar } from '@/components/TopBar';

export const metadata: Metadata = { title: 'Privacy Notice · House of Marketers' };

export default function PrivacyNotice() {
  return (
    <>
      <TopBar left={<Link href="/" className="header-link">← Back To Assessment</Link>} />
      <main className="page doc">
        <h1 className="title-md">Candidate Assessment <span className="accent">Privacy Notice</span></h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 8 }}>Effective date: {notice.effectiveDate}</p>
        <p>{notice.intro}</p>
        {notice.sections.map((s) => (
          <section key={s.title} className="stack" style={{ gap: 10 }}>
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
      </main>
    </>
  );
}
