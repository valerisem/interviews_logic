'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Inline time-limit control for a candidate who has not finished yet. */
export function TimeLimitEditor({ id, minutes }: { id: string; minutes: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(minutes));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const dirty = Number(value) !== minutes;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState('saving');
    const res = await fetch(`/api/admin/assessments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeLimitMinutes: Number(value) }),
    });
    setState(res.ok ? 'saved' : 'error');
    if (res.ok) router.refresh();
  }

  return (
    <form className="limit-editor" onSubmit={save}>
      <input
        className="input input-sm"
        type="number"
        min={1}
        max={240}
        value={value}
        onChange={(e) => { setValue(e.target.value); setState('idle'); }}
        aria-label="Time limit in minutes"
      />
      <span className="muted">min</span>
      {dirty && <button type="submit" className="btn btn-secondary btn-sm" disabled={state === 'saving'}>Save</button>}
      {state === 'saved' && !dirty && <span className="muted">Saved</span>}
      {state === 'error' && <span className="error">Not saved</span>}
    </form>
  );
}
