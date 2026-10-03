'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CandidateState } from '@/lib/assessment';
import { LETTERS, QuestionBlocks } from './QuestionBlocks';
import { TopBar } from './TopBar';

type InProgress = Extract<CandidateState, { status: 'in_progress' }>;

const BLOCKED_KEYS = new Set(['c', 'x', 'v', 'a', 'p', 's', 'u']);

/** Block selection, copy/paste, the context menu and common copy/print shortcuts. Screenshots cannot be blocked. */
function useCopyProtection() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) e.preventDefault();
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

/** Count each time the candidate leaves the tab or window. Recorded only, never penalised. */
function useLeaveTracking(token: string, active: boolean) {
  useEffect(() => {
    if (!active) return;
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

async function post(url: string, body?: unknown): Promise<{ state?: CandidateState; error?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error ?? 'Something went wrong. Please try again.' };
  return { state: data as CandidateState };
}

export function Assessment({ token, initial, recruiterEmail }: { token: string; initial: CandidateState; recruiterEmail: string }) {
  const [state, setState] = useState<CandidateState>(initial);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(initial.status === 'in_progress' ? initial.remainingSeconds : 0);
  const endsAt = useRef<number | null>(null);
  const finishing = useRef(false);

  useCopyProtection();
  useLeaveTracking(token, state.status === 'in_progress');

  const apply = useCallback((next: CandidateState) => {
    setState(next);
    setSelected([]);
    setError('');
    if (next.status === 'in_progress') {
      // The deadline is set by the server; the clock keeps running whether or not this tab is visible.
      endsAt.current = Date.now() + next.remainingSeconds * 1000;
      setRemaining(next.remainingSeconds);
    } else {
      endsAt.current = null;
    }
  }, []);

  useEffect(() => {
    if (initial.status === 'in_progress') endsAt.current = Date.now() + initial.remainingSeconds * 1000;
  }, [initial]);

  // Countdown. When it reaches zero, ask the server to close the assessment.
  useEffect(() => {
    if (state.status !== 'in_progress') return;
    const tick = () => {
      if (endsAt.current === null) return;
      const left = (endsAt.current - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0 && !finishing.current) {
        finishing.current = true;
        post(`/api/a/${token}/finish`).then(({ state: s }) => {
          finishing.current = false;
          if (s) apply(s);
        });
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [state.status, token, apply]);

  async function start() {
    setBusy(true);
    const { state: s, error: e } = await post(`/api/a/${token}/start`);
    setBusy(false);
    if (s) apply(s);
    else setError(e!);
  }

  async function submit(q: InProgress) {
    setBusy(true);
    const { state: s, error: e } = await post(`/api/a/${token}/answer`, { questionIndex: q.index, selected });
    setBusy(false);
    if (s) apply(s);
    else setError(e!);
  }

  if (state.status === 'completed') {
    return (
      <div className="protected">
        <TopBar />
        <main className="page center">
          <div className="done-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D3FE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </div>
          <h1 className="title-md" style={{ marginTop: 8 }}>Assessment completed</h1>
          <p className="lead" style={{ fontSize: 16 }}>
            Thank you. Your responses have been submitted successfully and will be reviewed as part of your application.
          </p>
        </main>
      </div>
    );
  }

  if (state.status === 'invited') {
    const minutes = Math.round(state.timeLimitSeconds / 60);
    return (
      <div className="protected">
        <TopBar><span className="topbar-meta">Candidate assessment</span></TopBar>
        <main className="page">
          <div className="stack">
            <span className="chip"><span className="chip-dot" />Before you begin</span>
            <h1 className="title">Candidate Assessment</h1>
            <p className="lead">
              This is a short assessment designed to understand how you work with information, prioritise tasks, follow
              instructions and solve everyday work-related problems.
            </p>
          </div>
          <div className="facts">
            <div><span className="fact-value">12</span><span className="muted">Questions</span></div>
            <div><span className="fact-value">~5 min</span><span className="muted">Approximate time</span></div>
            <div><span className="fact-value">{minutes} min</span><span className="muted">Time limit</span></div>
          </div>
          <div className="stack body" style={{ gap: 10 }}>
            <p>The assessment contains 12 questions and should take approximately 5 minutes.</p>
            <p>You will see one question at a time.</p>
            <p>Once you start, the timer will begin.</p>
          </div>
          <div className="note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6D3FE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>
            <span>If you require a reasonable adjustment to complete this assessment, please contact your recruiter before pressing Start.</span>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="row" style={{ paddingTop: 4 }}>
            <button type="button" className="btn btn-primary" onClick={start} disabled={busy}>
              {busy ? 'Starting…' : 'Start Assessment'}
            </button>
            <a
              className="btn btn-secondary"
              href={`mailto:${recruiterEmail}?subject=${encodeURIComponent('Candidate assessment')}`}
            >
              Contact Recruiter
            </a>
          </div>
        </main>
      </div>
    );
  }

  const q = state.question;
  const need = q.kind === 'multi' ? q.selectCount! : 1;
  const toggle = (id: string) => {
    if (q.kind === 'single') return setSelected([id]);
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < need ? [...cur, id] : cur));
  };
  const isLast = state.index === state.total - 1;
  const low = remaining <= 60;

  return (
    <div className="protected">
      <TopBar progress={state.index / state.total}>
        <div className={`timer${low ? ' low' : ''}`} role="timer" aria-label="Time remaining">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M9 2h6" /></svg>
          <span>{formatClock(remaining)}</span>
        </div>
      </TopBar>
      <main className="page question" key={state.index}>
        <div className="q-number">
          <span className="q-badge">{state.index + 1}</span>
          <span>Question {state.index + 1} of {state.total}</span>
        </div>
        <QuestionBlocks blocks={q.blocks} />
        <div className="stack-sm">
          <h1 className="q-prompt" id="prompt">{q.prompt}</h1>
          {q.kind === 'multi' && <p className="muted">Select {need} answers.</p>}
        </div>
        <fieldset className="options" aria-labelledby="prompt">
          {q.options.map((o, i) => {
            const on = selected.includes(o.id);
            return (
              <label key={o.id} className={`option${on ? ' selected' : ''}`}>
                <input
                  type={q.kind === 'single' ? 'radio' : 'checkbox'}
                  name="answer"
                  checked={on}
                  onChange={() => toggle(o.id)}
                />
                <span className="option-letter">{LETTERS[i]}</span>
                <span>{o.text}</span>
              </label>
            );
          })}
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="q-footer">
          <span className="muted">You can’t return to a question once you continue.</span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || selected.length !== need}
            onClick={() => submit(state)}
          >
            {busy ? 'Saving…' : isLast ? 'Submit assessment' : 'Next question'}
          </button>
        </div>
      </main>
    </div>
  );
}
