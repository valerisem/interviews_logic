'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EXTRA_TIME_CHOICES } from '@/lib/extraTime';


/** Extra time on every question, for a reasonable adjustment. Takes effect immediately. */
export function ExtraTimeSelect({ id, value }: { id: string; value: number }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [failed, setFailed] = useState(false);

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value);
    setCurrent(next);
    const res = await fetch(`/api/admin/assessments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMultiplier: next }),
    });
    setFailed(!res.ok);
    if (res.ok) router.refresh();
    else setCurrent(value);
  }

  return (
    <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <select className="select" value={current} onChange={change} aria-label="Extra time">
        {EXTRA_TIME_CHOICES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      {failed && <span className="error" style={{ fontSize: 13 }}>Not saved</span>}
    </span>
  );
}
