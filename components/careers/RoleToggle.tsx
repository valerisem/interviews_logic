'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

/** Admin switch that opens or closes a role on the public careers page. */
export function RoleToggle({ slug, title, open }: { slug: string; title: string; open: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    const res = await fetch(`/api/admin/careers/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open: !open }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? 'Could not save.');
      return;
    }
    start(() => router.refresh());
  }

  return (
    <span className="cr-toggle-wrap">
      <button type="button" role="switch" aria-checked={open} aria-label={`${title}: ${open ? 'open' : 'closed'}`} className={`cr-toggle${open ? ' on' : ''}`} onClick={toggle} disabled={pending}>
        <i />
        <span>{open ? 'Open' : 'Closed'}</span>
      </button>
      {error && <em className="cr-toggle-error">{error}</em>}
    </span>
  );
}
