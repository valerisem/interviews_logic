'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TrashIcon } from './TrashIcon';

/** Permanently deletes a submission after a confirmation prompt. */
export function DeleteButton({ id, name, redirectTo }: { id: string; name: string; redirectTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete ${name}'s submission? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/assessments/${id}`, { method: 'DELETE' });
    setBusy(false);
    setFailed(!res.ok);
    if (!res.ok) return;
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <button type="button" className="icon-danger" disabled={busy} onClick={remove} aria-label={`Delete ${name}'s submission`} title="Delete">
        <TrashIcon />
      </button>
      {failed && <span className="error" style={{ fontSize: 13 }}>Not deleted</span>}
    </span>
  );
}
