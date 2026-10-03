'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CreateLinkForm({ defaultMinutes }: { defaultMinutes: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    setCopied(false);
    const res = await fetch('/api/admin/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? 'Could not create the link.');
    setLink(json.link);
    form.reset();
    router.refresh();
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <section className="panel">
      <h2 className="h2">New assessment link</h2>
      <form className="form-grid" onSubmit={onSubmit}>
        <label className="field">Candidate name<input className="input" name="name" required /></label>
        <label className="field">Candidate email<input className="input" name="email" type="email" required /></label>
        <label className="field">Role<input className="input" name="role" defaultValue="Campaign Manager" required /></label>
        <label className="field">
          Time limit (mins)
          <input className="input" name="timeLimitMinutes" type="number" min={1} max={240} defaultValue={defaultMinutes} required />
        </label>
        <label className="field">Recruiter email (optional)<input className="input" name="recruiterEmail" type="email" /></label>
        <button type="submit" className="btn btn-primary" style={{ minHeight: 44 }} disabled={busy}>
          {busy ? 'Generating…' : 'Generate link'}
        </button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {link && (
        <div className="link-box">
          <span className="muted" style={{ fontSize: 14 }}>Link</span>
          <code>{link}</code>
          <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      )}
      <p className="muted">Set a longer time limit when a reasonable adjustment has been agreed with the candidate.</p>
    </section>
  );
}
