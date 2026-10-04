'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CandidateState } from '@/lib/assessment';
import type { AssessmentType, Option } from '@/lib/types';
import { LETTERS, QuestionBlocks } from './QuestionBlocks';
import { TopBar } from './TopBar';

type InProgress = Extract<CandidateState, { status: 'in_progress' }>;
type View = CandidateState | { status: 'enrol' };

const ROLES: [AssessmentType, string][] = [
  ['campaign_manager', 'Campaign Manager'],
  ['account_manager', 'Account Manager'],
];

const BLOCKED_KEYS = new Set(['c', 'x', 'v', 'a', 'p', 's', 'u']);

/** Block selection, copy/paste, the context menu and common shortcuts outside form fields. Screenshots cannot be blocked. */
function useCopyProtection() {
  useEffect(() => {
    const inField = (e: Event) => e.target instanceof HTMLInputElement;
    const prevent = (e: Event) => {
      if (!inField(e)) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!inField(e) && (e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) e.preventDefault();
    };
    const events = ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'] as const;
    events.forEach((ev) => document.addEventListener(ev, prevent));
    document.addEventListener('keydown', onKey);
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, prevent));
      document.removeEventListener('keydown', onKey);
    };
  }, []);
}

/** Count each time the candidate leaves the tab or window. Recorded for the recruiter, never penalised. */
function useLeaveTracking(token: string, active: boolean) {
  useEffect(() => {
    if (!active || !token) return;
    let away = false;
    const leave = () => {
      if (away) return;
      away = true;
      fetch(`/api/a/${token}/leave`, { method: 'POST', keepalive: true }).catch(() => {});
    };
    const back = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) away = false;
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? leave() : back());
    window.addEventListener('blur', leave);
    window.addEventListener('focus', back);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', leave);
      window.removeEventListener('focus', back);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token, active]);
}

function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

async function postJson<T>(url: string, body: unknown): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error ?? 'Something went wrong. Please try again.' };
    return { data: data as T };
  } catch {
    return { error: 'Connection problem. Please check your internet and try again.' };
  }
}

// ---------------------------------------------------------------------------
// Drag-to-rank list (mouse, touch and keyboard)
// ---------------------------------------------------------------------------

function RankingList({ items, order, onChange }: { items: Option[]; order: string[]; onChange: (next: string[]) => void }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const refs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [dragging, setDragging] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = order.slice();
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    onChange(next);
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent<HTMLLIElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(id);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    if (!dragging) return;
    const from = order.indexOf(dragging);
    // Find the slot whose middle the pointer has passed.
    let to = 0;
    order.forEach((id, i) => {
      const el = refs.current.get(id);
      if (el && e.clientY > el.getBoundingClientRect().top + el.offsetHeight / 2) to = i;
    });
    if (e.clientY < (refs.current.get(order[0])?.getBoundingClientRect().top ?? 0)) to = 0;
    if (to !== from) move(from, to);
  };
  const endDrag = () => setDragging(null);

  return (
    <ol className="rank-list" aria-label="Items in priority order, highest first">
      {order.map((id, pos) => (
        <li
          key={id}
          ref={(el) => {
            if (el) refs.current.set(id, el);
            else refs.current.delete(id);
          }}
          className={`rank-item${dragging === id ? ' dragging' : ''}`}
          onPointerDown={onPointerDown(id)}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="badge" aria-label={`Priority ${pos + 1}`}>{pos + 1}</span>
          <svg className="grip" width="14" height="22" viewBox="0 0 14 22" fill="currentColor" aria-hidden="true"><circle cx="4" cy="5" r="1.6" /><circle cx="10" cy="5" r="1.6" /><circle cx="4" cy="11" r="1.6" /><circle cx="10" cy="11" r="1.6" /><circle cx="4" cy="17" r="1.6" /><circle cx="10" cy="17" r="1.6" /></svg>
          <span className="text">{byId.get(id)?.text}</span>
          <span className="rank-moves">
            <button type="button" onClick={() => move(pos, pos - 1)} disabled={pos === 0} aria-label="Move up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
            </button>
            <button type="button" onClick={() => move(pos, pos + 1)} disabled={pos === order.length - 1} aria-label="Move down">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------

export function Assessment({ token: initialToken = '', initial, recruiterEmail }: { token?: string; initial: View; recruiterEmail: string }) {
  const [token, setToken] = useState(initialToken);
  const [state, setState] = useState<View>(initial);
  const [details, setDetails] = useState({ name: '', email: '' });
  const [assessmentType, setAssessmentType] = useState<AssessmentType | ''>('');
  const [privacyAck, setPrivacyAck] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(initial.status === 'in_progress' ? initial.remainingSeconds : 0);
  const endsAt = useRef<number | null>(null);
  const submitting = useRef(false);
  const latest = useRef({ selected, order, touched });
  latest.current = { selected, order, touched };

  useCopyProtection();
  useLeaveTracking(token, state.status === 'in_progress');

  const apply = useCallback((next: CandidateState) => {
    setState(next);
    setSelected([]);
    setTouched(false);
    setError('');
    if (next.status === 'in_progress') {
      setOrder(next.question.options.map((o) => o.id));
      // The server sets the deadline; the clock keeps running whether or not this tab is visible.
      endsAt.current = Date.now() + next.remainingSeconds * 1000;
      setRemaining(next.remainingSeconds);
    } else {
      endsAt.current = null;
    }
  }, []);

  useEffect(() => {
    if (initial.status === 'in_progress') apply(initial);
  }, [initial, apply]);

  const submit = useCallback(
    async (q: InProgress, timedOut: boolean) => {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      const { selected: sel, order: ord, touched: moved } = latest.current;
      // On timeout, whatever is selected at that moment is recorded (a ranking only if it was rearranged).
      const answer = q.question.kind === 'ranking' ? (timedOut && !moved ? [] : ord) : sel;
      const { data, error: err } = await postJson<CandidateState>(`/api/a/${token}/answer`, {
        questionIndex: q.index,
        selected: answer,
        timedOut,
      });
      submitting.current = false;
      setBusy(false);
      if (data) apply(data);
      else setError(err!);
    },
    [token, apply],
  );

  // Per-question countdown. At zero the current answer is submitted automatically.
  useEffect(() => {
    if (state.status !== 'in_progress') return;
    const q = state;
    const tick = () => {
      if (endsAt.current === null) return;
      const left = (endsAt.current - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0) submit(q, true);
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [state, submit]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!assessmentType) return setError('Please choose the role you’re interviewing for.');
    if (!privacyAck) return setError('Please confirm that you have read the Candidate Assessment Privacy Notice.');
    setBusy(true);
    setError('');
    const { data, error: err } = await postJson<{ token: string; state: CandidateState }>('/api/start', { ...details, assessmentType, privacyAck });
    setBusy(false);
    if (!data) return setError(err!);
    setToken(data.token);
    // Give the attempt its own address so a reload resumes it rather than starting again.
    window.history.replaceState(null, '', `/a/${data.token}`);
    apply(data.state);
  }

  if (state.status === 'completed') {
    return (
      <div className="protected">
        <TopBar />
        <main className="page center">
          <div className="done-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </div>
          <h1 className="title-md">Assessment <span className="accent">Completed</span></h1>
          <p className="meta" style={{ fontSize: 16, lineHeight: 1.6 }}>
            Thank you. Your responses have been submitted successfully and will be reviewed as part of your application.
          </p>
        </main>
      </div>
    );
  }

  if (state.status === 'enrol') {
    const set = (k: keyof typeof details) => (e: React.ChangeEvent<HTMLInputElement>) => setDetails((d) => ({ ...d, [k]: e.target.value }));
    return (
      <div className="protected">
        <TopBar />
        <main className="page">
          <div className="stack">
            <h1 className="title">Candidate <span className="accent">Assessment</span></h1>
            <p className="meta">6 questions · About 3 minutes · Each question has its own timer</p>
          </div>
          <form id="enrol" className="stack" style={{ gap: 16 }} onSubmit={start}>
            <label className="field">
              What’s your name?
              <input className="input" name="name" autoComplete="name" placeholder="Full name" required value={details.name} onChange={set('name')} />
            </label>
            <label className="field">
              What’s your email?
              <input className="input" name="email" type="email" autoComplete="email" placeholder="you@example.com" required value={details.email} onChange={set('email')} />
            </label>
            <fieldset className="field role-choice">
              <legend>Which role are you interviewing for?</legend>
              <div className="role-options">
                {ROLES.map(([value, label]) => (
                  <label key={value} className={`option${assessmentType === value ? ' selected' : ''}`}>
                    <input type="radio" name="role" value={value} checked={assessmentType === value} onChange={() => setAssessmentType(value)} required />
                    <span className="radio-dot" aria-hidden="true" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="check" style={{ paddingTop: 4 }}>
              <input type="checkbox" checked={privacyAck} onChange={(e) => setPrivacyAck(e.target.checked)} required />
              <span>
                I confirm that I have read and understood the{' '}
                <a href="/privacy" target="_blank" rel="noopener">Candidate Assessment Privacy Notice</a>.
              </span>
            </label>
          </form>
          <div className="stack">
            {error && <p className="error" role="alert">{error}</p>}
            <div className="row">
              <button type="submit" form="enrol" className="btn btn-primary" disabled={busy || !privacyAck || !assessmentType}>
                {busy ? 'Starting…' : 'Start Assessment'}
              </button>
              <a className="btn btn-secondary" href={`mailto:${recruiterEmail}?subject=${encodeURIComponent('Candidate Assessment')}`}>
                Contact Recruiter
              </a>
            </div>
            <p className="muted">If you require a reasonable adjustment to complete this assessment, please contact your recruiter before starting.</p>
          </div>
        </main>
      </div>
    );
  }

  const q = state.question;
  const isLast = state.index === state.total - 1;
  const ready = q.kind === 'ranking' ? true : selected.length === 1;

  return (
    <div className="protected">
      <TopBar
        progress={state.index / state.total}
        left={
          <div className={`timer${remaining <= 5 ? ' low' : ''}`} role="timer" aria-label="Time left on this question">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M9 2h6" /></svg>
            <span>{formatClock(remaining)}</span>
          </div>
        }
      />
      <main className="page question" key={state.index}>
        <div className="q-number">Question {state.index + 1} of {state.total}</div>
        <QuestionBlocks blocks={q.blocks} />
        <h1 className="q-prompt" id="prompt">{q.prompt}</h1>
        {q.kind === 'ranking' ? (
          <>
            <RankingList
              items={q.options}
              order={order}
              onChange={(next) => {
                setOrder(next);
                setTouched(true);
              }}
            />
            <p className="muted">Drag the items, or use the arrows, to put them in order. 1 is the highest priority.</p>
          </>
        ) : (
          <fieldset className="options" aria-labelledby="prompt">
            {q.options.map((o, i) => {
              const on = selected.includes(o.id);
              return (
                <label key={o.id} className={`option${on ? ' selected' : ''}`}>
                  <input type="radio" name="answer" checked={on} onChange={() => setSelected([o.id])} />
                  <span className="badge">{LETTERS[i]}</span>
                  <span>{o.text}</span>
                </label>
              );
            })}
          </fieldset>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="q-footer">
          <button type="button" className="btn btn-primary" disabled={busy || !ready} onClick={() => submit(state, false)}>
            {busy ? 'Saving…' : isLast ? 'Submit Assessment' : 'Next Question'}
          </button>
        </div>
      </main>
    </div>
  );
}
