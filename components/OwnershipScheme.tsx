'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * The ownership / accountability model opened from the org chart's “Show Ownership Scheme” button:
 * five swimlanes (CEO at the top, functional teams at the bottom) and one tab per flow. Each flow's
 * steps run left to right, sitting in the lane of whoever does that step, joined by arrows
 * (dashed and two-headed for a two-way working relationship, amber for an escalation to the CEO).
 */

export interface SchemeStep {
  lane: string;
  who: string;
  tags?: string[];
  /** Short line before the list, e.g. “Measures”. */
  lead?: string;
  lines?: string[];
  /** Label on the arrow coming into this step. */
  via?: string;
  /** 'both': a two-way working relationship rather than a hand-off. */
  rel?: 'both';
  /** 'input': data or a need coming into the flow rather than a person. */
  kind?: 'input';
  /** Step index (or indexes) this one connects from; default the step before, -1 for none. */
  from?: number | number[];
  /** Condition for a step that only happens sometimes, e.g. “IF material investment is required”. */
  when?: string;
}
export type SchemeItem = SchemeStep | { phase: string };
export interface SchemeFlow {
  id: string;
  title: string;
  steps: SchemeItem[];
  examples?: string[];
  note?: string;
  /** Short hand-off chains shown under the diagram. */
  sequences?: string[][];
  /** The flow's key statements, shown as a highlighted band. */
  keyLines?: string[];
  divide?: { title: string; quotes?: boolean; sides: { who: string; quote: string }[] };
}
export interface OwnershipScheme {
  title: string;
  /** Who owns what, shown above the labels. */
  roles?: { who: string; text: string }[];
  lanes: { id: string; title: string; members?: string[] }[];
  labels: { key: string; text: string }[];
  overview: {
    steps: SchemeItem[];
    message: string[];
    summary: { lead: string; steps: string[] };
  };
  flows: SchemeFlow[];
}

const TAG_COLOURS: Record<string, string> = {
  OWNS: '#200888', RUNS: '#0E9BD6', CONTROL: '#F0438F', COLLAB: '#8B5CF6', ESCALATE: '#D97706', VALIDATES: '#0F766E',
};
const tagColour = (tag: string) => TAG_COLOURS[tag.split(/[\s/]/)[0]] ?? '#6B7280';
const isPhase = (s: SchemeItem): s is { phase: string } => 'phase' in s;

function Tag({ tag }: { tag: string }) {
  return <b className="sl-tag" style={{ background: tagColour(tag) }}>{tag}</b>;
}

interface Edge { d: string; kind: 'flow' | 'both' | 'escalate' | 'cond'; label?: { x: number; y: number; w: number; text: string }; delay: number }

function Swimlanes({ lanes, steps }: { lanes: OwnershipScheme['lanes']; steps: SchemeItem[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const laneIndex = (id: string) => Math.max(0, lanes.findIndex((l) => l.id === id));

  const measure = useCallback(() => {
    const out: Edge[] = [];
    let order = 0;
    steps.forEach((s, i) => {
      if (isPhase(s)) return;
      // Join to the step(s) named in `from`, else the one before (nothing across a phase divider).
      const sources = s.from === undefined ? [i - 1] : ([] as number[]).concat(s.from);
      for (const j of sources) {
      const prev = steps[j];
      if (j < 0 || !prev || isPhase(prev)) continue;
      const a = cardRefs.current[j], b = cardRefs.current[i];
      if (!a || !b) continue;
      const A = { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
      const B = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
      const ty = B.y + Math.min(B.h / 2, 40);
      const tx = B.x;
      let d: string, label: Edge['label'];
      if ((prev as SchemeStep).lane === s.lane) {
        const sy = A.y + Math.min(A.h / 2, 40);
        d = `M ${A.x + A.w} ${sy} L ${tx} ${sy}`;
        if (s.via) label = { x: (A.x + A.w + tx) / 2, y: sy - 12, w: tx - A.x - A.w, text: s.via };
      } else {
        // Leave the source card from its top or bottom, travel along the target's lane, enter from the left.
        const cx = A.x + Math.min(A.w / 2, 60);
        const sy = B.y < A.y ? A.y : A.y + A.h;
        d = `M ${cx} ${sy} L ${cx} ${ty} L ${tx} ${ty}`;
        if (s.via) label = { x: (cx + tx) / 2, y: ty - 12, w: tx - cx - 12, text: s.via };
      }
      const kind = s.rel === 'both' ? 'both' : s.when ? 'cond' : s.tags?.some((t) => t.startsWith('ESCALATE')) ? 'escalate' : 'flow';
      out.push({ d, kind, label, delay: 250 + order++ * 140 });
      }
    });
    setEdges(out);
  }, [steps]);

  useLayoutEffect(() => {
    measure();
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const cols = steps.map((s) => (isPhase(s) ? '64px' : 'minmax(var(--sl-col), 1fr)')).join(' ');
  let n = 0;
  return (
    <div className="sl-scroll">
      <div ref={gridRef} className="sl-grid" style={{ gridTemplateColumns: `var(--sl-label) ${cols}`, gridTemplateRows: `repeat(${lanes.length}, auto)` }}>
        {lanes.map((l, i) => (
          <div key={`bg-${l.id}`} className={`sl-lane ${l.id}`} style={{ gridRow: i + 1, gridColumn: '1 / -1' }} />
        ))}
        {lanes.map((l, i) => (
          <div key={`label-${l.id}`} className="sl-label" style={{ gridRow: i + 1, gridColumn: 1 }}>
            <span>{i + 1}</span>
            {l.title}
          </div>
        ))}
        {steps.map((s, i) => {
          if (isPhase(s)) {
            return (
              <div key={i} className="sl-phase" style={{ gridRow: `1 / ${lanes.length + 1}`, gridColumn: i + 2 }}>
                <span>{s.phase}</span>
              </div>
            );
          }
          const accent = s.tags?.length ? tagColour(s.tags[0]) : undefined;
          return (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={`sl-step${s.kind === 'input' ? ' input' : ''}${s.lane === 'hoo' ? ' hoo' : ''}`}
              style={{ gridRow: laneIndex(s.lane) + 1, gridColumn: i + 2, borderTopColor: accent, animationDelay: `${n++ * 140}ms` }}
            >
              {s.when && <div className="sl-when">{s.when}</div>}
              {s.tags && <div className="sl-tags">{s.tags.map((t) => <Tag key={t} tag={t} />)}</div>}
              <div className="sl-who">{s.who}</div>
              {s.lead && <div className="sl-lead">{s.lead}</div>}
              {s.lines && (s.lines.length === 1 && !s.lead
                ? <p>{s.lines[0]}</p>
                : <ul>{s.lines.map((t) => <li key={t}>{t}</li>)}</ul>)}
            </div>
          );
        })}
        <svg className="sl-edges" aria-hidden="true">
          <defs>
            {(['flow', 'both', 'escalate', 'cond'] as const).map((k) => (
              <marker key={k} id={`sl-arrow-${k}`} markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                <path d="M0,0 L9,4 L0,8 z" className={`sl-head ${k}`} />
              </marker>
            ))}
          </defs>
          {edges.map((e, i) => (
            <path key={i} d={e.d} className={`sl-edge ${e.kind}`} style={{ animationDelay: `${e.delay}ms` }}
              markerEnd={`url(#sl-arrow-${e.kind})`} markerStart={e.kind === 'both' ? `url(#sl-arrow-${e.kind})` : undefined} />
          ))}
        </svg>
        {edges.map((e, i) => e.label && (
          <span key={`l${i}`} className="sl-via" style={{ left: e.label.x, top: e.label.y, maxWidth: Math.max(150, e.label.w), animationDelay: `${e.delay}ms` }}>
            {e.label.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export function OwnershipSchemeView({ scheme, onClose }: { scheme: OwnershipScheme; onClose: () => void }) {
  const [tab, setTab] = useState(-1); // -1: the model overview; otherwise a flow index
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const flow = tab >= 0 ? scheme.flows[tab] : null;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose(); }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      before?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  // Arrow buttons for the tab row, shown only on a side that has more tabs to scroll to.
  const tabsRef = useRef<HTMLElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const updateScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScroll({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    updateScroll();
    window.addEventListener('resize', updateScroll);
    return () => window.removeEventListener('resize', updateScroll);
  }, [updateScroll]);
  const scrollTabs = (dir: number) => {
    const el = tabsRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const go = (t: number) => {
    setTab(t);
    bodyRef.current?.scrollTo({ top: 0 });
    bodyRef.current?.closest('.scheme-panel')?.scrollTo({ top: 0 });
    document.getElementById(`scheme-tab-${t}`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };

  return createPortal(
    <div className="scheme" onClick={onClose}>
      <div className="scheme-panel" role="dialog" aria-modal="true" aria-labelledby="scheme-title" onClick={(e) => e.stopPropagation()}>
        <header className="scheme-head">
          <div>
            <p className="collab-eyebrow">Head of Operations</p>
            <h2 id="scheme-title" className="collab-title">{scheme.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="collab-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        {scheme.roles && (
          <ul className="scheme-roles">
            {scheme.roles.map((r) => <li key={r.who}><b>{r.who}</b>{r.text}</li>)}
          </ul>
        )}
        <ul className="scheme-legend">
          {scheme.labels.map((l) => (
            <li key={l.key}><Tag tag={l.key} /> {l.text}</li>
          ))}
        </ul>

        <div className="scheme-tabs-wrap">
        {canScroll.left && <button type="button" className="scheme-tabs-arrow left" onClick={() => scrollTabs(-1)} aria-label="Earlier flows"><span>‹</span></button>}
        {canScroll.right && <button type="button" className="scheme-tabs-arrow right" onClick={() => scrollTabs(1)} aria-label="Later flows"><span>›</span></button>}
        <nav ref={tabsRef} className="scheme-tabs" role="tablist" aria-label="Flows" onScroll={updateScroll}>
          <button id="scheme-tab--1" type="button" role="tab" aria-selected={tab === -1} className={tab === -1 ? 'on' : ''} onClick={() => go(-1)}>
            <small>Overview</small>The Model
          </button>
          {scheme.flows.map((f, i) => (
            <button key={f.id} id={`scheme-tab-${i}`} type="button" role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => go(i)}>
              <small>Flow {i + 1}</small>{f.title}
            </button>
          ))}
        </nav>
        </div>

        <div ref={bodyRef} className="scheme-body" key={tab}>
          <h3 className="scheme-flow-title">
            {flow ? <><span>Flow {tab + 1}</span>{flow.title}</> : <><span>Overview</span>How the layers connect</>}
          </h3>
          <Swimlanes lanes={scheme.lanes} steps={flow ? flow.steps : scheme.overview.steps} />

          {flow?.keyLines && (
            <section className="scheme-key">
              {flow.keyLines.map((k) => <p key={k}>{k}</p>)}
            </section>
          )}
          {flow?.sequences && (
            <section className="scheme-extra">
              <h4>Flow</h4>
              <div className="scheme-seqs">
                {flow.sequences.map((seq) => (
                  <ol key={seq[0]} className="scheme-seq">{seq.map((x) => <li key={x}>{x}</li>)}</ol>
                ))}
              </div>
            </section>
          )}
          {flow?.examples && (
            <section className="scheme-extra">
              <h4>Examples</h4>
              <ul className="scheme-chips">{flow.examples.map((x) => <li key={x}>{x}</li>)}</ul>
            </section>
          )}
          {flow?.note && (
            <section className="scheme-extra scheme-note">
              <h4>Note</h4>
              <p>{flow.note}</p>
            </section>
          )}
          {flow?.divide && (
            <section className="scheme-extra">
              <h4>{flow.divide.title}</h4>
              <div className="scheme-divide">
                {flow.divide.sides.map((s) => (
                  <blockquote key={s.who}><b>{s.who}</b>{flow.divide!.quotes === false ? s.quote : `“${s.quote}”`}</blockquote>
                ))}
              </div>
            </section>
          )}

          {!flow && (
            <>
              <section className="scheme-extra">
                <ol className="scheme-chain">{scheme.overview.message.map((m) => <li key={m}>{m}</li>)}</ol>
              </section>
              <section className="scheme-summary">
                <p>{scheme.overview.summary.lead}</p>
                <ol className="scheme-chain light">{scheme.overview.summary.steps.map((m) => <li key={m}>{m}</li>)}</ol>
              </section>
            </>
          )}

          <div className="scheme-pager">
            {tab > -1 ? <button type="button" onClick={() => go(tab - 1)}>← {tab === 0 ? 'The Model' : `Flow ${tab}`}</button> : <span />}
            {tab < scheme.flows.length - 1 && <button type="button" onClick={() => go(tab + 1)}>Flow {tab + 2}: {scheme.flows[tab + 1].title} →</button>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
