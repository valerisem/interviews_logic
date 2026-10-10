'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Company Accountability Map, opened from the org chart's “Ownership Model” button. The whole company sits
 * on one landscape map (Board and CEO at the top, functional leaders, then their teams). On its own the map
 * shows the management structure as flowing lines. Pick a task (or press Play to tour them all) and the map
 * animates who does what: the accountable role glows, collaborators flow in (purple), the management chain
 * runs down (blue), the final decision goes across (teal) and escalation climbs up (orange). The exact
 * wording for the task sits beside the map.
 */

type Kind = 'top' | 'lead' | 'team' | 'ext' | 'future';
export interface MapNode { id: string; label: string; x: number; y: number; kind: Kind }
export interface MapTask {
  task: string;
  accountable?: string[];
  current?: string[];
  currentLabel?: string;
  dayToDay?: string[];
  manages?: string[];
  future?: string[];
  collaborates?: string[];
  decision?: string[];
  escalation?: string[];
  examples?: string[];
  ids: {
    accountable?: string[]; current?: string[]; dayToDay?: string[]; collaborates?: string[];
    decision?: string[]; escalation?: string[]; manages?: (string | null)[]; future?: (string | null)[]; escChain?: boolean;
  };
}
export interface AccountabilityMap {
  title: string;
  key: { key: string; label: string; text: string }[];
  nodes: MapNode[];
  sections: { id: string; title: string; tasks: MapTask[] }[];
  escalation: { title: string; routes: { issue: string; route: string }[] };
  management: { title: string; groups: { manager: string; reports: string[] }[]; edges: [string, string][]; future: [string, string][] };
}

type EdgeType = 'collab' | 'manages' | 'decision' | 'escalation' | 'future';
interface Edge { from: string; to: string; type: EdgeType }

const W = 1610, H = 790;
const SIZE: Record<Kind, [number, number]> = { top: [220, 70], lead: [184, 72], team: [156, 78], ext: [156, 78], future: [156, 78] };
const COLOUR: Record<EdgeType, string> = { collab: '#8B5CF6', manages: '#0E9BD6', decision: '#0F766E', escalation: '#D97706', future: '#0E9BD6' };
const DELAY: Record<EdgeType, number> = { collab: 0, manages: 350, future: 350, decision: 750, escalation: 1150 };
const TOUR_MS = 6500;

/** A curved line between two boxes: down or up between rows, arcing over the row when side by side. */
function curve(a: MapNode, b: MapNode) {
  const [, ah] = SIZE[a.kind], [, bh] = SIZE[b.kind];
  if (b.y > a.y + 20) {
    const sy = a.y + ah / 2, ty = b.y - bh / 2, m = (ty - sy) / 2;
    return `M ${a.x} ${sy} C ${a.x} ${sy + m} ${b.x} ${ty - m} ${b.x} ${ty}`;
  }
  if (b.y < a.y - 20) {
    const sy = a.y - ah / 2, ty = b.y + bh / 2, m = (sy - ty) / 2;
    return `M ${a.x} ${sy} C ${a.x} ${sy - m} ${b.x} ${ty + m} ${b.x} ${ty}`;
  }
  const sy = a.y - ah / 2, ty = b.y - bh / 2, lift = 46 + Math.abs(b.x - a.x) * 0.12;
  return `M ${a.x} ${sy} C ${a.x} ${sy - lift} ${b.x} ${ty - lift} ${b.x} ${ty}`;
}

function FlowEdge({ d, type, delay }: { d: string; type: EdgeType; delay: number }) {
  const c = COLOUR[type];
  const dashed = type !== 'manages';
  return (
    <g className="amap-edge" style={{ animationDelay: `${delay}ms` }}>
      <path d={d} fill="none" stroke={c} strokeOpacity={0.14} strokeWidth={9} strokeLinecap="round" />
      <path d={d} fill="none" stroke={c} strokeWidth={type === 'future' ? 2 : 3} strokeLinecap="round"
        className={dashed ? 'amap-dash' : undefined} strokeDasharray={dashed ? (type === 'future' ? '8 8' : '2 9') : undefined}
        markerEnd={`url(#amap-arrow-${type})`} opacity={type === 'future' ? 0.7 : 1} />
      {type !== 'future' && [0, 0.55].map((lag) => (
        <circle key={lag} r={type === 'manages' ? 4.5 : 5.5} fill={c} opacity={0}>
          <animateMotion dur="2.4s" begin={`${delay / 1000 + lag}s`} repeatCount="indefinite" path={d} />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.4s" begin={`${delay / 1000 + lag}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

const ROLE_BADGE: Record<string, [string, string]> = {
  accountable: ['Accountable', '#200888'], current: ['Current accountability', '#B45309'], dayToDay: ['Day-to-day owner', '#0E9BD6'],
  decision: ['Final decision', '#0F766E'], escalation: ['Escalation', '#D97706'], collaborates: ['Collaborates', '#8B5CF6'], manages: ['Manages', '#0E9BD6'],
};

function Field({ cls, label, items }: { cls: string; label: string; items: string[] }) {
  return (
    <div className={`amap-field ${cls}`}>
      <h5>{label}</h5>
      <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

export function AccountabilityMapView({ map, onClose }: { map: AccountabilityMap; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const all = useMemo(() => map.sections.flatMap((s) => s.tasks.map((t) => ({ t, area: s.title }))), [map]);
  // -1: whole company (management structure); -2: escalation structure; otherwise a task index.
  const [sel, setSel] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const byId = useMemo(() => new Map(map.nodes.map((n) => [n.id, n])), [map]);

  const pick = useCallback((i: number) => { setPlaying(false); setSel(i); }, []);
  const step = (dir: number) => { setPlaying(false); setSel((s) => (s < 0 ? (dir > 0 ? 0 : all.length - 1) : (s + dir + all.length) % all.length)); };

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setSel((s) => (s < 0 ? 0 : (s + 1) % all.length)), TOUR_MS);
    return () => clearInterval(t);
  }, [playing, all.length]);

  // When the map is wider than the screen (phones), slide it so the accountable role is in view.
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = stageRef.current, main = stage?.querySelector('.amap-node.main') as SVGGElement | null;
    if (!stage || stage.scrollWidth <= stage.clientWidth) return;
    const left = main ? main.getBoundingClientRect().left - stage.getBoundingClientRect().left + stage.scrollLeft - stage.clientWidth / 2 + 60 : 0;
    stage.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [sel]);

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

  const cur = sel >= 0 ? all[sel] : null;

  // Which boxes play which part, and the lines between them.
  const { roles, edges } = useMemo(() => {
    const roles = new Map<string, string[]>();
    const add = (id: string | null | undefined, r: string) => {
      if (!id) return;
      const list = roles.get(id) ?? [];
      if (!list.includes(r)) list.push(r);
      roles.set(id, list);
    };
    const edges: Edge[] = [];
    if (!cur) {
      if (sel === -1) {
        map.management.edges.forEach(([a, b]) => edges.push({ from: a, to: b, type: 'manages' }));
        map.management.future.forEach(([a, b]) => edges.push({ from: a, to: b, type: 'future' }));
      } else {
        ['hoo', 'cfo', 'legal', 'ceo', 'board'].forEach((id) => add(id, 'escalation'));
      }
      return { roles, edges };
    }
    const ids = cur.t.ids;
    const acc = ids.accountable?.length ? ids.accountable : ids.current ?? [];
    const lead = acc[0];
    ids.accountable?.forEach((id) => add(id, 'accountable'));
    ids.current?.forEach((id) => add(id, 'current'));
    ids.dayToDay?.forEach((id) => add(id, 'dayToDay'));
    ids.collaborates?.forEach((id) => {
      if (acc.includes(id)) return;
      add(id, 'collaborates');
      if (lead) edges.push({ from: id, to: lead, type: 'collab' });
    });
    const chain = (list: (string | null)[] | undefined, type: EdgeType) => {
      const l = (list ?? []).filter(Boolean) as string[];
      l.forEach((id) => add(id, 'manages'));
      for (let i = 1; i < l.length; i++) edges.push({ from: l[i - 1], to: l[i], type });
    };
    chain(ids.manages, 'manages');
    chain(ids.future, 'future');
    ids.decision?.forEach((id) => {
      add(id, 'decision');
      if (lead && id !== lead) edges.push({ from: lead, to: id, type: 'decision' });
    });
    let from = lead;
    ids.escalation?.forEach((id) => {
      add(id, 'escalation');
      if (from && id !== from) edges.push({ from, to: id, type: 'escalation' });
      if (ids.escChain) from = id;
    });
    return { roles, edges };
  }, [cur, sel, map]);

  const active = (id: string) => roles.has(id) || edges.some((e) => e.from === id || e.to === id);
  const dimOthers = sel !== -1;

  return createPortal(
    <div className="scheme" onClick={onClose}>
      <div className="scheme-panel" role="dialog" aria-modal="true" aria-labelledby="amap-title" onClick={(e) => e.stopPropagation()}>
        <header className="scheme-head">
          <div>
            <p className="collab-eyebrow">House of Marketers</p>
            <h2 id="amap-title" className="collab-title">{map.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="collab-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <ul className="amap-key">
          {map.key.map((k) => <li key={k.key} className={`k-${k.key}`}><i /><b>{k.label}</b> {k.text}</li>)}
        </ul>

        <div className="amap">
          <aside className="amap-list">
            <div className="amap-controls">
              <button type="button" onClick={() => step(-1)} aria-label="Previous task">‹</button>
              <button type="button" className="play" onClick={() => { if (!playing && sel < 0) setSel(0); setPlaying((p) => !p); }}>
                {playing ? '❚❚ Pause' : '▶ Play all'}
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next task">›</button>
            </div>
            <div className="amap-scroll" hidden>
              <button id="amap-task--1" type="button" className={`amap-item whole${sel === -1 ? ' on' : ''}`} onClick={() => pick(-1)}>Whole company · {map.management.title}</button>
              <button id="amap-task--2" type="button" className={`amap-item whole${sel === -2 ? ' on' : ''}`} onClick={() => pick(-2)}>{map.escalation.title}</button>
              {map.sections.map((s) => (
                <div key={s.id}>
                  <h4>{s.title}</h4>
                  {s.tasks.map((t) => {
                    const i = all.findIndex((x) => x.t === t);
                    return <button key={t.task} id={`amap-task-${i}`} type="button" className={`amap-item${sel === i ? ' on' : ''}`} onClick={() => pick(i)}>{t.task}</button>;
                  })}
                </div>
              ))}
            </div>
            <select className="amap-select" value={sel} onChange={(e) => pick(Number(e.target.value))} aria-label="Choose a task">
              <option value={-1}>Whole company · {map.management.title}</option>
              <option value={-2}>{map.escalation.title}</option>
              {map.sections.map((s) => (
                <optgroup key={s.id} label={s.title}>
                  {s.tasks.map((t) => <option key={t.task} value={all.findIndex((x) => x.t === t)}>{t.task}</option>)}
                </optgroup>
              ))}
            </select>
          </aside>

          <div ref={stageRef} className="amap-stage">
            <svg viewBox={`-10 0 ${W} ${H}`} className="amap-svg" role="img" aria-label="Company accountability map" key={sel}>
              <defs>
                {(Object.keys(COLOUR) as EdgeType[]).map((t) => (
                  <marker key={t} id={`amap-arrow-${t}`} markerWidth="14" markerHeight="14" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L12,6 L0,12 z" fill={COLOUR[t]} />
                  </marker>
                ))}
              </defs>
              {edges.map((e, i) => {
                const a = byId.get(e.from), b = byId.get(e.to);
                return a && b ? <FlowEdge key={i} d={curve(a, b)} type={e.type} delay={DELAY[e.type] + (i % 6) * 60} /> : null;
              })}
              {map.nodes.map((n) => {
                const [w, h] = SIZE[n.kind];
                const r = roles.get(n.id) ?? [];
                const main = r.includes('accountable') || r.includes('current');
                const on = active(n.id);
                return (
                  <g key={n.id} transform={`translate(${n.x - w / 2} ${n.y - h / 2})`}
                    className={`amap-node ${n.kind}${main ? ' main' : ''}${dimOthers && !on ? ' dim' : ''}`}>
                    {main && <rect className="amap-pulse" x={-7} y={-7} width={w + 14} height={h + 14} rx={20} />}
                    <rect className="amap-box" width={w} height={h} rx={14}
                      style={r.length && !main ? { stroke: ROLE_BADGE[r[0]][1], strokeWidth: 3.5 } : undefined} />
                    <foreignObject width={w} height={h}>
                      <div className="amap-label">{n.label}</div>
                    </foreignObject>
                    {r.length > 0 && (
                      <foreignObject x={-50} y={-26} width={w + 100} height={24}>
                        <div className="amap-badges">
                          {r.slice(0, 2).map((x) => <span key={x} style={{ background: ROLE_BADGE[x][1] }}>{ROLE_BADGE[x][0]}</span>)}
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <aside className="amap-detail" key={`d${sel}`}>
            {cur ? (
              <>
                <p className="amap-area">{cur.area}</p>
                <h3>{cur.t.task}</h3>
                {cur.t.accountable && <Field cls="accountable" label="Accountable" items={cur.t.accountable} />}
                {cur.t.current && <Field cls="current" label={cur.t.currentLabel ?? 'Current accountability'} items={cur.t.current} />}
                {cur.t.dayToDay && <Field cls="manages" label="Day-to-day owner" items={cur.t.dayToDay} />}
                {cur.t.manages && <Field cls="manages" label="Manages" items={[cur.t.manages.join(' → ')]} />}
                {cur.t.future && <Field cls="manages" label="Future structure" items={[cur.t.future.join(' → ')]} />}
                {cur.t.collaborates && <Field cls="collaborates" label="Collaborates" items={cur.t.collaborates} />}
                {cur.t.decision && <Field cls="final-decision" label="Final decision" items={cur.t.decision} />}
                {cur.t.escalation && <Field cls="escalation" label="Escalation" items={cur.t.escalation} />}
                {cur.t.examples && <Field cls="examples" label="Examples" items={cur.t.examples} />}
              </>
            ) : sel === -1 ? (
              <>
                <p className="amap-area">Whole company</p>
                <h3>{map.management.title}</h3>
                {map.management.groups.map((g) => <Field key={g.manager} cls="manages" label={g.manager} items={g.reports} />)}
              </>
            ) : (
              <>
                <p className="amap-area">Whole company</p>
                <h3>{map.escalation.title}</h3>
                {map.escalation.routes.map((r) => <Field key={r.issue} cls="escalation" label={r.issue} items={[`→ ${r.route}`]} />)}
              </>
            )}
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
