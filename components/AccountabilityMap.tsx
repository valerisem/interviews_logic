'use client';

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Company Accountability Map, opened from the org chart's “Ownership Model” button: one page, one swimlane
 * chart. Every department is a lane (Board and CEO on the left), every task in the company is a row,
 * grouped by area. In each row, each department involved carries its letter: A accountable,
 * R responsible (does the work), C collaborates, D final decision, E escalation. Arrows flow between the lanes: collaborators
 * into the accountable lane (purple), out to the final decision
 * (teal) and up to escalation (orange). Clicking a row shows its exact wording. The escalation and
 * management structures sit at the bottom of the same page.
 */

type Letter = 'A' | 'R' | 'C' | 'M' | 'D' | 'E';
export interface MapTask {
  task: string;
  accountable?: string[];
  current?: string[];
  currentLabel?: string;
  responsible?: string[];
  manages?: string[];
  future?: string[];
  collaborates?: string[];
  decision?: string[];
  escalation?: string[];
  examples?: string[];
  ids: {
    accountable?: string[]; current?: string[]; responsible?: string[]; collaborates?: string[];
    decision?: string[]; escalation?: string[]; manages?: (string | null)[]; manages2?: (string | null)[]; future?: (string | null)[]; escChain?: boolean;
  };
}
export interface AccountabilityMap {
  title: string;
  key: { key: string; label: string; text: string }[];
  lanes: { id: string; title: string; roles: Record<string, string> }[];
  sections: { id: string; title: string; tasks: MapTask[] }[];
  escalation: { title: string; routes: { issue: string; route: string }[] };
  management: { title: string; groups: { manager: string; reports: string[] }[] };
  veto?: { label: string; text: string };
}

const LETTERS: Letter[] = ['A', 'R', 'C', 'D', 'E'];

/** The Board / Investors' crown: absolute right of veto and the final decision on everything. */
function Crown({ size = 14 }: { size?: number }) {
  return (
    <svg className="sw-crown" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 18 L2 7 L7.5 11 L12 4 L16.5 11 L22 7 L21 18 Z" />
      <rect x="3" y="19.2" width="18" height="2.6" rx="1" />
    </svg>
  );
}
const LETTER_KEY: Record<Letter, string> = { A: 'accountable', R: 'responsible', C: 'collaborates', M: 'manages', D: 'final-decision', E: 'escalation' };
// Colours come from the page's theme (see .scheme-panel in globals.css), so light and dark mode both match.
const COLOUR: Record<Letter, string> = { A: 'var(--sw-A)', R: 'var(--sw-R)', C: 'var(--sw-C)', M: 'var(--sw-M)', D: 'var(--sw-D)', E: 'var(--sw-E)' };
const PILL_H = 54, PILL_GAP = 4, ARC_ROOM = 34;
const stackH = (n: number) => n * PILL_H + Math.max(0, n - 1) * PILL_GAP;

interface Cell { role: string; letters: Letter[]; current?: boolean }
interface Arc { from: number; to: number; fromRole: string; toRole: string; type: Letter; dashed?: boolean }

/** Which departments play which part in a task, and the arrows between them. */
function layout(t: MapTask, laneOf: Map<string, number>) {
  const cells = new Map<number, Cell[]>();
  const mark = (role: string | null | undefined, l: Letter, current = false) => {
    if (!role) return;
    const lane = laneOf.get(role);
    if (lane === undefined) return;
    const list = cells.get(lane) ?? [];
    let c = list.find((x) => x.role === role);
    if (!c) { c = { role, letters: [] }; list.push(c); }
    if (!c.letters.includes(l)) c.letters.push(l);
    if (current) c.current = true;
    cells.set(lane, list);
  };
  const ids = t.ids;
  ids.accountable?.forEach((r) => mark(r, 'A'));
  ids.current?.forEach((r) => mark(r, 'A', true));
  ids.responsible?.forEach((r) => mark(r, 'R'));
  ids.collaborates?.forEach((r) => mark(r, 'C'));
  ids.decision?.forEach((r) => mark(r, 'D'));
  ids.escalation?.forEach((r) => mark(r, 'E'));
  cells.forEach((list) => list.forEach((c) => c.letters.sort((a, b) => LETTERS.indexOf(a) - LETTERS.indexOf(b))));

  // Arrows join specific roles (not just departments), so they always point at the right person.
  const owner = (ids.accountable?.length ? ids.accountable : ids.current)?.[0];
  const arcs: Arc[] = [];
  const push = (fromRole: string | null | undefined, toRole: string | null | undefined, type: Letter, dashed = false) => {
    if (!fromRole || !toRole) return;
    const from = laneOf.get(fromRole), to = laneOf.get(toRole);
    if (from === undefined || to === undefined || from === to) return;
    if (!arcs.some((a) => a.fromRole === fromRole && a.toRole === toRole && a.type === type)) arcs.push({ from, to, fromRole, toRole, type, dashed });
  };
  ids.collaborates?.forEach((r) => push(r, owner, 'C'));
  ids.decision?.forEach((r) => push(owner, r, 'D'));
  let from = owner;
  ids.escalation?.forEach((r) => {
    push(from, r, 'E');
    if (ids.escChain) from = r;
  });
  return { cells, arcs };
}

function Detail({ t }: { t: MapTask }) {
  const rows: [string, string, string[] | undefined][] = [
    ['accountable', 'Accountable', t.accountable],
    ['current', t.currentLabel ?? 'Current accountability', t.current],
    ['responsible', 'Responsible', t.responsible],
    ['manages', 'Manages', t.manages && [t.manages.join(' → ')]],
    ['manages', 'Future structure', t.future && [t.future.join(' → ')]],
    ['collaborates', 'Collaborates', t.collaborates],
    ['final-decision', 'Final decision', t.decision],
    ['escalation', 'Escalation', t.escalation],
    ['examples', 'Examples', t.examples],
  ];
  return (
    <div className="sw-detail">
      {rows.filter(([, , v]) => v?.length).map(([cls, label, v]) => (
        <div key={label} className={`sw-field ${cls}`}>
          <h5>{label}</h5>
          <ul>{v!.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

export function AccountabilityMapView({ map, onClose }: { map: AccountabilityMap; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const [colW, setColW] = useState(96);
  const [open, setOpen] = useState<string | null>(null);

  const laneOf = useMemo(() => {
    const m = new Map<string, number>();
    map.lanes.forEach((l, i) => Object.keys(l.roles).forEach((r) => m.set(r, i)));
    return m;
  }, [map]);
  const roleName = useMemo(() => {
    const m = new Map<string, string>();
    map.lanes.forEach((l) => Object.entries(l.roles).forEach(([r, n]) => m.set(r, n)));
    return m;
  }, [map]);

  // Lane width, so arrows can be drawn between lane centres.
  useLayoutEffect(() => {
    const el = lanesRef.current;
    if (!el) return;
    const measure = () => setColW(el.clientWidth / map.lanes.length);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [map.lanes.length]);

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

  const cx = (lane: number) => (lane + 0.5) * colW;
  const boardLane = map.lanes.findIndex((l) => l.id === 'board');
  const span = colW * (map.lanes.length - 1);
  /*
   * Arrows run from label to label as arches: collaboration and management above the labels, final decision and
   * escalation below. The longer the hop, the higher the arch, so arrows into the same lane nest instead of
   * running along one line.
   */
  const arcPath = (a: Arc, rowH: number, cells: Map<number, Cell[]>) => {
    const mid = rowH / 2, hw = (colW - 8) / 2;
    const x1 = cx(a.from), x2 = cx(a.to), dir = Math.sign(x2 - x1);
    const above = a.type === 'C' || a.type === 'M';
    const h = ARC_ROOM * (0.3 + 0.62 * Math.abs(x2 - x1) / span);
    // Where a role's label sits in its department's stack: arrows join the top (or bottom) edge of the end label,
    // and the side of a label in the middle of a stack, so they point at that exact role.
    const spot = (lane: number, role: string) => {
      const list = (cells.get(lane) ?? []).slice(0, 3);
      const n = Math.max(1, list.length), i = Math.max(0, list.findIndex((c) => c.role === role));
      const top = mid - stackH(n) / 2 + i * (PILL_H + PILL_GAP);
      const end = above ? i === 0 : i === n - 1;
      return { end, y: end ? (above ? top : top + PILL_H) : top + PILL_H / 2 };
    };
    const s0 = spot(a.from, a.fromRole), s1 = spot(a.to, a.toRole);
    const peak = above ? Math.min(mid - stackH(3) / 2, s0.y, s1.y) - h : Math.max(mid + stackH(3) / 2, s0.y, s1.y) + h;
    const sx = s0.end ? x1 + dir * 10 : x1 + dir * hw, ex = s1.end ? x2 - dir * 10 : x2 - dir * hw;
    const c1 = s0.end ? `${sx} ${peak}` : `${sx + dir * 34} ${peak}`;
    const c2 = s1.end ? `${ex} ${peak}` : `${ex - dir * 34} ${s1.y}`;
    return `M ${sx} ${s0.y} C ${c1} ${c2} ${ex} ${s1.y}`;
  };

  return createPortal(
    <div className="scheme" onClick={onClose}>
      <div className="scheme-panel" role="dialog" aria-modal="true" aria-labelledby="sw-title" onClick={(e) => e.stopPropagation()}>
        <header className="scheme-head">
          <div>
            <h2 id="sw-title" className="collab-title">{map.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="collab-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <ul className="sw-key">
          {LETTERS.map((l) => {
            const k = map.key.find((x) => x.key === LETTER_KEY[l]);
            return (
              <li key={l}>
                <i className={l} style={{ background: COLOUR[l] }}>{l}</i>
                {l !== 'R' && <svg width="30" height="10" aria-hidden="true"><path d="M2 5 H24" style={{ stroke: COLOUR[l] }} strokeWidth="3" strokeDasharray={l === 'M' ? undefined : '2 5'} strokeLinecap="round" fill="none" /><path d="M23 1 L29 5 L23 9 z" style={{ fill: COLOUR[l] }} /></svg>}
                <b className={l} style={l === 'A' ? undefined : { color: COLOUR[l] }}>{k?.label}</b> {k?.text}
              </li>
            );
          })}
          {map.veto && <li className="sw-veto-key"><Crown size={18} /><b>{map.veto.label}</b> {map.veto.text}</li>}
        </ul>

        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            {LETTERS.map((l) => (
              <marker key={l} id={`sw-head-${l}`} markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L8,4 L0,8 z" style={{ fill: COLOUR[l] }} />
              </marker>
            ))}
          </defs>
        </svg>

        <div className="sw-body">
          <div className="sw-chart">
            <div className="sw-row sw-head">
              <div className="sw-task">Task</div>
              <div className="sw-lanes" ref={lanesRef}>
                {map.lanes.map((l) => <div key={l.id} className="sw-lane-title">{l.title}</div>)}
              </div>
            </div>

            {map.sections.map((s) => (
              <Fragment key={s.id}>
                <div className="sw-area"><span>{s.title}</span></div>
                {s.tasks.map((t) => {
                  const { cells, arcs } = layout(t, laneOf);
                  const isOpen = open === t.task;
                  const count = (lane: number) => Math.min(3, cells.get(lane)?.length ?? 1);
                  const rowH = Math.max(...[...cells.keys()].map(count), 1) * (PILL_H + PILL_GAP) + ARC_ROOM * 2 + 8;
                  return (
                    <Fragment key={t.task}>
                      <div className={`sw-row${isOpen ? ' open' : ''}`} onClick={() => setOpen(isOpen ? null : t.task)}>
                        <div className="sw-task"><span>{t.task}</span><em>{isOpen ? '−' : '+'}</em></div>
                        <div className="sw-lanes">
                          {map.lanes.map((l) => <div key={l.id} className="sw-lane" style={{ height: rowH }} />)}
                          <svg className="sw-arcs" width="100%" height={rowH} aria-hidden="true">
                            {arcs.map((a, i) => (
                              <path key={i} d={arcPath(a, rowH, cells)} className={`sw-arc t-${a.type}${a.dashed ? ' future' : ''}`} markerEnd={`url(#sw-head-${a.type})`} />
                            ))}
                          </svg>
                          {/* The Board can veto and overrule anything, so every row carries its crown. */}
                          {!cells.has(boardLane) && (
                            <div className="sw-cell" style={{ left: cx(boardLane), width: colW - 8 }}>
                              <div className="sw-veto" title={map.veto?.text}><Crown size={18} /></div>
                            </div>
                          )}
                          {[...cells.entries()].map(([lane, list]) => (
                            <div key={lane} className="sw-cell" style={{ left: cx(lane), width: colW - 8 }}>
                              {list.slice(0, 3).map((c) => (
                                <div key={c.role} className={`sw-pill${c.letters.includes('A') ? ' acc' : ''}${c.current ? ' current' : ''}`}>
                                  <span className="sw-letters">{c.role === 'board' && <Crown size={16} />}{c.letters.map((l) => <i key={l} className={l} style={{ background: COLOUR[l] }}>{l}</i>)}</span>
                                  <span className="sw-role">{roleName.get(c.role)}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                      {isOpen && <Detail t={t} />}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </div>

          <div className="sw-structures">
            <section>
              <h3>{map.escalation.title}</h3>
              <ol className="sw-ladder">
                {map.escalation.routes.map((r) => <li key={r.issue}><span>{r.issue}</span><b>{r.route.includes('Board') && <Crown size={15} />}{r.route}</b></li>)}
              </ol>
            </section>
            <section>
              <h3>{map.management.title}</h3>
              <div className="sw-groups">
                {map.management.groups.map((g) => (
                  <div key={g.manager}><b>{g.manager}</b><ul>{g.reports.map((r) => <li key={r}>{r}</li>)}</ul></div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
