'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Company-wide accountability canvas, opened from the org chart's “Show Company Scheme” button.
 * One landscape canvas, no tabs: fourteen horizontal lanes (CEO at the top), each with its leader in
 * a fixed column so connections can run in clear channels beside that column without crossing cards:
 * reporting and escalation lines on the left, Head of Operations' collaboration and support lines on
 * the right. Cross-company flows and the accountability summary sit at the bottom. Drag or scroll to
 * move, pinch / ctrl + scroll / buttons to zoom; hovering a card highlights its lines.
 */

export type SchemeEdgeType = 'solid' | 'collab' | 'support' | 'escalate';
export interface SchemeSection { h?: string; text?: string; items?: string[]; chain?: string[] }
export interface SchemeCard { id: string; title: string; kind: 'role' | 'info'; badge?: string; wide?: boolean; sections: SchemeSection[] }
export interface CompanyScheme {
  title: string;
  legend: { type: SchemeEdgeType; text: string }[];
  lanes: { id: string; title: string; cards: SchemeCard[] }[];
  edges: { from: string; to: string; type: SchemeEdgeType }[];
  flows: { title: string; chain: string[]; both?: boolean; escalate?: boolean }[];
  summary: { who: string; text: string }[];
}

const WORLD_W = 4400;
const ANCHOR = 30; // y offset from a card's top where lines join it
const MIN_K = 0.05, MAX_K = 1.6;

interface Box { x: number; y: number; w: number; h: number; lane: number }
interface DrawnEdge { d: string; type: SchemeEdgeType; from: string; to: string }

function LineSample({ type }: { type: SchemeEdgeType }) {
  return (
    <svg width="38" height="10" viewBox="0 0 38 10" aria-hidden="true">
      <line x1="2" y1="5" x2="30" y2="5" className={`cs-edge ${type}`} />
      <path d="M29,1 L37,5 L29,9 z" className={`cs-head ${type}`} />
    </svg>
  );
}

function Card({ card, refFn, hover, setHover }: {
  card: SchemeCard; refFn: (el: HTMLDivElement | null) => void; hover: string | null; setHover: (id: string | null) => void;
}) {
  return (
    <div
      ref={refFn}
      className={`cs-card ${card.kind}${card.wide ? ' wide' : ''}${hover === card.id ? ' on' : ''}`}
      onPointerEnter={() => setHover(card.id)}
      onPointerLeave={() => setHover(null)}
    >
      {card.badge && <b className="cs-badge">{card.badge}</b>}
      <div className="cs-title">{card.title}</div>
      <div className="cs-secs">
        {card.sections.map((s, i) => (
          <div key={i} className="cs-sec">
            {s.h && <h5>{s.h}</h5>}
            {s.text && <p>{s.text}</p>}
            {s.items && <ul className={s.items.length > 4 ? 'cols' : undefined}>{s.items.map((t) => <li key={t}>{t}</li>)}</ul>}
            {s.chain && <ol className="cs-chain">{s.chain.map((t) => <li key={t}>{t}</li>)}</ol>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompanySchemeView({ scheme, onClose }: { scheme: CompanyScheme; onClose: () => void }) {
  const viewRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLDivElement>());
  const laneEls = useRef<(HTMLDivElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState({ k: 0.5, x: 12, y: 12 });
  const [size, setSize] = useState({ w: WORLD_W, h: 2000 });
  const [edges, setEdges] = useState<DrawnEdge[]>([]);
  const [hover, setHover] = useState<string | null>(null);

  const laneOf = new Map<string, number>();
  scheme.lanes.forEach((l, i) => l.cards.forEach((c) => laneOf.set(c.id, i)));

  // Route every connection from the cards' laid-out positions.
  const measure = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    setSize({ w: world.offsetWidth, h: world.offsetHeight });
    const box = (id: string): Box | null => {
      const el = cardEls.current.get(id);
      return el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, lane: laneOf.get(id) ?? 0 } : null;
    };
    const lead = box(scheme.lanes[0].cards[0].id);
    if (!lead) return;
    const leadL = lead.x, leadR = lead.x + lead.w;
    const ch = { ceo: leadL - 28, escalate: leadL - 54, hoo: leadL - 82, collab: leadR + 30, support: leadR + 62 };
    const corridor = (lane: number, off: number) => (laneEls.current[lane]?.offsetTop ?? 0) + off;
    const out: DrawnEdge[] = [];
    for (const e of scheme.edges) {
      const A = box(e.from), B = box(e.to);
      if (!A || !B) continue;
      const ya = A.y + ANCHOR, yb = B.y + ANCHOR;
      let d: string;
      if (A.lane === B.lane) {
        // Report beside its manager in the same lane: straight across.
        const y = Math.min(A.y, B.y) + ANCHOR;
        d = A.x > B.x ? `M ${A.x} ${y} H ${B.x + B.w}` : `M ${A.x + A.w} ${y} H ${B.x}`;
      } else if (e.type === 'solid' || e.type === 'escalate') {
        // Up the left-hand channels into the manager's (or CEO's) left side.
        const x = e.type === 'escalate' ? ch.escalate : e.to === 'ceo' ? ch.ceo : ch.hoo;
        const isLead = Math.abs(A.x - leadL) < 2;
        const start = isLead ? `M ${A.x} ${ya} H ${x}` : `M ${A.x + A.w / 2} ${A.y} V ${corridor(A.lane, 12)} H ${x}`;
        d = `${start} V ${yb} H ${B.x}`;
      } else {
        // Down the right-hand channels from the Head of Operations / Technology Operations card.
        const x = e.type === 'collab' ? ch.collab : ch.support;
        d = `M ${A.x + A.w} ${ya} H ${x} V ${yb} H ${B.x > x ? B.x : B.x + B.w}`;
      }
      out.push({ d, type: e.type, from: e.from, to: e.to });
    }
    setEdges(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme]);

  const fitWidth = useCallback(() => {
    const v = viewRef.current;
    if (!v) return;
    const k = Math.min(MAX_K, Math.max(MIN_K, (v.clientWidth - 24) / WORLD_W));
    setView({ k, x: (v.clientWidth - WORLD_W * k) / 2, y: 12 });
  }, []);
  const fitAll = useCallback(() => {
    const v = viewRef.current, w = worldRef.current;
    if (!v || !w) return;
    const k = Math.max(MIN_K, Math.min((v.clientWidth - 24) / w.offsetWidth, (v.clientHeight - 24) / w.offsetHeight));
    setView({ k, x: (v.clientWidth - w.offsetWidth * k) / 2, y: 12 });
  }, []);

  useLayoutEffect(() => {
    measure();
    fitAll();
    const w = worldRef.current;
    if (!w) return;
    const ro = new ResizeObserver(measure);
    ro.observe(w);
    return () => ro.disconnect();
  }, [measure, fitAll]);

  const zoomAt = useCallback((factor: number, mx?: number, my?: number) => {
    const v = viewRef.current;
    if (!v) return;
    setView((s) => {
      const cx = mx ?? v.clientWidth / 2, cy = my ?? v.clientHeight / 2;
      const k = Math.min(MAX_K, Math.max(MIN_K, s.k * factor));
      return { k, x: cx - ((cx - s.x) / s.k) * k, y: cy - ((cy - s.y) / s.k) * k };
    });
  }, []);

  // Scroll moves around the canvas; pinch (ctrl + wheel on trackpads) zooms.
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = v.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      } else setView((s) => ({ ...s, x: s.x - e.deltaX, y: s.y - e.deltaY }));
    };
    v.addEventListener('wheel', onWheel, { passive: false });
    return () => v.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Drag to pan, two fingers to pinch-zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinch = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    else { drag.current = null; pinch.current = null; }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      if (pinch.current) {
        const r = viewRef.current!.getBoundingClientRect();
        zoomAt(dist / pinch.current, (p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top);
      }
      pinch.current = dist;
      return;
    }
    const d = drag.current;
    if (d) setView((s) => ({ ...s, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };

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

  const refFor = (id: string) => (el: HTMLDivElement | null) => {
    if (el) cardEls.current.set(id, el);
    else cardEls.current.delete(id);
  };

  return createPortal(
    <div className="scheme" onClick={onClose}>
      <div className="scheme-panel" role="dialog" aria-modal="true" aria-labelledby="scheme-title" onClick={(e) => e.stopPropagation()}>
        <header className="scheme-head">
          <div>
            <p className="collab-eyebrow">House of Marketers</p>
            <h2 id="scheme-title" className="collab-title">{scheme.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="collab-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <ul className="cs-legend">
          {scheme.legend.map((l) => <li key={l.type}><LineSample type={l.type} />{l.text}</li>)}
        </ul>

        <div
          ref={viewRef}
          className="cs-view"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div ref={worldRef} className="cs-world" style={{ width: WORLD_W, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
            <svg className="cs-edges" width={size.w} height={size.h} aria-hidden="true">
              <defs>
                {(['solid', 'collab', 'support', 'escalate'] as const).map((t) => (
                  <marker key={t} id={`cs-arrow-${t}`} markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L10,5 L0,10 z" className={`cs-head ${t}`} />
                  </marker>
                ))}
              </defs>
              {edges.map((e, i) => {
                const on = hover && (e.from === hover || e.to === hover);
                return (
                  <path key={i} d={e.d} className={`cs-edge ${e.type}${on ? ' on' : ''}${hover && !on ? ' dim' : ''}`}
                    markerEnd={`url(#cs-arrow-${e.type})`} markerStart={e.type === 'collab' ? `url(#cs-arrow-${e.type})` : undefined} />
                );
              })}
            </svg>

            {scheme.lanes.map((lane, i) => (
              <div key={lane.id} ref={(el) => { laneEls.current[i] = el; }} className={`cs-lane ${lane.id}`}>
                <div className="cs-lane-label"><span>{i + 1}</span>{lane.title}</div>
                <div className="cs-lead">
                  <Card card={lane.cards[0]} refFn={refFor(lane.cards[0].id)} hover={hover} setHover={setHover} />
                </div>
                <div className="cs-rest">
                  {lane.cards.slice(1).map((c) => <Card key={c.id} card={c} refFn={refFor(c.id)} hover={hover} setHover={setHover} />)}
                </div>
              </div>
            ))}

            <section className="cs-band">
              <h3>Cross-company accountability flows</h3>
              <div className="cs-flows">
                {scheme.flows.map((f) => (
                  <div key={f.title} className={`cs-flow${f.both ? ' both' : ''}${f.escalate ? ' escalate' : ''}`}>
                    <h5>{f.title}</h5>
                    <ol className="cs-chain">{f.chain.map((t) => <li key={t}>{t}</li>)}</ol>
                  </div>
                ))}
              </div>
            </section>
            <section className="cs-band">
              <h3>Accountability summary</h3>
              <div className="cs-summary">
                {scheme.summary.map((s) => <div key={s.who}><b>{s.who}</b>{s.text}</div>)}
              </div>
            </section>
          </div>

          <div className="cs-controls" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={fitWidth}>Fit width</button>
            <button type="button" onClick={fitAll}>Whole view</button>
            <button type="button" onClick={() => zoomAt(1.25)} aria-label="Zoom in">+</button>
            <button type="button" onClick={() => zoomAt(0.8)} aria-label="Zoom out">−</button>
          </div>
          <p className="cs-hint">Drag or scroll to move · Pinch, ctrl + scroll or +/− to zoom · Hover a card to highlight its lines</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
