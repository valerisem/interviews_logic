'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrashIcon } from './TrashIcon';

const BOXES = 'input.row-select';

function checkedIds(): string[] {
  return [...document.querySelectorAll<HTMLInputElement>(`${BOXES}:checked`)].map((b) => b.value);
}

/** Header checkbox: selects or clears every row on the current tab. */
export function SelectAll() {
  const [state, setState] = useState<'none' | 'some' | 'all'>('none');
  useEffect(() => {
    const update = () => {
      const all = document.querySelectorAll(BOXES).length;
      const n = checkedIds().length;
      setState(n === 0 ? 'none' : n === all ? 'all' : 'some');
    };
    document.addEventListener('change', update);
    return () => document.removeEventListener('change', update);
  }, []);
  return (
    <input
      type="checkbox"
      className="checkbox"
      aria-label="Select all"
      checked={state === 'all'}
      ref={(el) => {
        if (el) el.indeterminate = state === 'some';
      }}
      onChange={(e) => {
        document.querySelectorAll<HTMLInputElement>(BOXES).forEach((b) => (b.checked = e.target.checked));
        document.dispatchEvent(new Event('change'));
      }}
    />
  );
}

/** Shows "Delete Selected" once any rows are ticked, and deletes them after confirmation. */
export function BulkDelete() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const update = () => setCount(checkedIds().length);
    document.addEventListener('change', update);
    return () => document.removeEventListener('change', update);
  }, []);

  async function remove() {
    const ids = checkedIds();
    if (!ids.length || !window.confirm(`Delete ${ids.length} submission${ids.length === 1 ? '' : 's'} from the dashboard?`)) return;
    setBusy(true);
    const res = await fetch('/api/admin/assessments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    setBusy(false);
    setFailed(!res.ok);
    if (!res.ok) return;
    setCount(0);
    router.refresh();
  }

  if (!count && !failed) return null;
  return (
    <div className="bulk-bar">
      <span>{count} selected</span>
      <button type="button" className="btn btn-danger" disabled={busy || !count} onClick={remove}>
        <TrashIcon size={16} /> {busy ? 'Deleting…' : 'Delete Selected'}
      </button>
      {failed && <span className="error" style={{ fontSize: 13 }}>Not deleted</span>}
    </div>
  );
}
