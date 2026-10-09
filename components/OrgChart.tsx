'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OrgCollab } from './OrgCollab';
import { OwnershipSchemeView, type OwnershipScheme } from './OwnershipScheme';

/*
 * Read-only, interactive copy of a saved Org Chart Whiteboard board (github.com/valerisem/org):
 * the same cards, pod boxes and reports-to arrows, drawn from a frozen snapshot of the board.
 * Opens zoomed in on the highlighted person and the people reporting to them. Drag to pan; scroll (with the
 * pointer over the chart), pinch or the buttons to zoom. Hover a card to see its reporting lines; click one that
 * has role notes to see how it works with the highlighted person.
 */

export interface OrgNode {
  id: string; name: string; role: string; x: number; y: number; w: number; h: number;
  color?: string; team?: string; future?: boolean; tag?: string; compact?: boolean;
}
export interface OrgEdge { id: string; from: string; to: string; type?: string; fromSide?: string; toSide?: string }
export interface OrgContainer { id: string; x: number; y: number; w: number; h: number; color: string; bg?: string; label: string }
export interface OrgSnapshot { nodes: OrgNode[]; edges: OrgEdge[]; containers: OrgContainer[] }
/** What a role owns, what it works on with the highlighted person, and where the line between them sits. */
export interface OrgRoleInfo {
  title: string; owns: string; works: string; line: string;
  /** Optional headings: owns (default “Owns”), works (default “Works with <person> on”), side (default “Their own role”). */
  labels?: { owns?: string; works?: string; side?: string };
}

const NAVY = '#0B0E1A', PINK = '#E91E8C', PUR = '#8B5CF6', GREY = '#6B7280', BORDER = '#ECECF1';
const CEO_GRAD = `linear-gradient(135deg, ${NAVY} 0%, ${PUR} 45%, ${PINK} 100%)`;
type Rect = { x: number; y: number; w: number; h: number };

// Same connector routing as the whiteboard app.
const sideAnchor = (r: Rect, side: string) => {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (side === 't') return { x: cx, y: r.y, dx: 0, dy: -1 };
  if (side === 'b') return { x: cx, y: r.y + r.h, dx: 0, dy: 1 };
  if (side === 'l') return { x: r.x, y: cy, dx: -1, dy: 0 };
  return { x: r.x + r.w, y: cy, dx: 1, dy: 0 };
};
const autoSide = (self: Rect, other: Rect) => {
  const dx = other.x + other.w / 2 - (self.x + self.w / 2), dy = other.y + other.h / 2 - (self.y + self.h / 2);
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'b' : 't';
};
function route(a: Rect, b: Rect, fromSide?: string, toSide?: string): string {
  const fs = fromSide && fromSide !== 'auto', ts = toSide && toSide !== 'auto';
  if (fs || ts) {
    const A = sideAnchor(a, fs ? fromSide! : autoSide(a, b));
    const B = sideAnchor(b, ts ? toSide! : autoSide(b, a));
    const S = 28, a1 = { x: A.x + A.dx * S, y: A.y + A.dy * S }, b1 = { x: B.x + B.dx * S, y: B.y + B.dy * S };
    const pts = [{ x: A.x, y: A.y }, a1];
    if (A.dx !== 0) {
      if (B.dx !== 0) { const mx = (a1.x + b1.x) / 2; pts.push({ x: mx, y: a1.y }, { x: mx, y: b1.y }); } else pts.push({ x: b1.x, y: a1.y });
    } else if (B.dy !== 0) { const my = (a1.y + b1.y) / 2; pts.push({ x: a1.x, y: my }, { x: b1.x, y: my }); } else pts.push({ x: a1.x, y: b1.y });
    pts.push(b1, { x: B.x, y: B.y });
    return 'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ');
  }
  const aL = a.x, aR = a.x + a.w, aT = a.y, aB = a.y + a.h, acx = a.x + a.w / 2, acy = a.y + a.h / 2;
  const bL = b.x, bR = b.x + b.w, bT = b.y, bB = b.y + b.h, bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
  const xOv = Math.min(aR, bR) - Math.max(aL, bL), yOv = Math.min(aB, bB) - Math.max(aT, bT);
  const stacked = bcy <= aT || bcy >= aB || (yOv <= 8 && Math.abs(bcy - acy) >= Math.abs(bcx - acx));
  if (stacked) {
    let sx: number, tx: number;
    if (xOv > 24) { const m = (Math.max(aL, bL) + Math.min(aR, bR)) / 2; sx = Math.min(Math.max(m, aL + 14), aR - 14); tx = Math.min(Math.max(m, bL + 14), bR - 14); }
    else { sx = acx; tx = bcx; }
    const above = bcy <= acy, sy = above ? aT : aB, ty = above ? bB : bT, my = (sy + ty) / 2;
    return `M ${sx} ${sy} L ${sx} ${my} L ${tx} ${my} L ${tx} ${ty}`;
  }
  let sy: number, ty: number;
  if (yOv > 20) { const m = (Math.max(aT, bT) + Math.min(aB, bB)) / 2; sy = m; ty = m; } else { sy = acy; ty = bcy; }
  const bRight = bcx > acx, sx = bRight ? aR : aL, tx = bRight ? bL : bR, mx = (sx + tx) / 2;
  return `M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ty} L ${tx} ${ty}`;
}

export function OrgChart({ data, highlight, roles, scheme }: {
  data: OrgSnapshot; highlight?: string; roles?: Record<string, OrgRoleInfo>; scheme?: OwnershipScheme;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ k: 0.2, x: 0, y: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const moved = useRef(false);
  const [open, setOpen] = useState<{ id: string; from: DOMRect } | null>(null);
  const closeCollab = useCallback(() => setOpen(null), []);
  const [showScheme, setShowScheme] = useState(false);
  const closeScheme = useCallback(() => setShowScheme(false), []);
  const partner = highlight ? data.nodes.find((n) => n.id === highlight) : undefined;

  const bounds = useCallback(() => {
    const rs: Rect[] = [...data.nodes, ...data.containers];
    const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
    const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
    return { x: x0 - 40, y: y0 - 40, w: x1 - x0 + 80, h: y1 - y0 + 80 };
  }, [data]);

  const fitTo = useCallback((r: Rect) => {
    const el = areaRef.current;
    if (!el) return;
    const k = Math.min(el.clientWidth / r.w, el.clientHeight / r.h, 1.4);
    setView({ k, x: (el.clientWidth - r.w * k) / 2 - r.x * k, y: (el.clientHeight - r.h * k) / 2 - r.y * k });
  }, []);
  const fit = useCallback(() => fitTo(bounds()), [fitTo, bounds]);

  const neighbours = useCallback((id: string) => {
    const set = new Set<string>();
    for (const e of data.edges) if (e.from === id || e.to === id) { set.add(e.from); set.add(e.to); }
    return set;
  }, [data]);

  const focusHighlight = useCallback(() => {
    if (!highlight) return fit();
    // The person and everyone who reports to them.
    const ids = new Set([highlight, ...data.edges.filter((e) => e.to === highlight).map((e) => e.from)]);
    const rs = data.nodes.filter((n) => ids.has(n.id));
    const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
    fitTo({ x: x0 - 60, y: y0 - 60, w: Math.max(...rs.map((r) => r.x + r.w)) - x0 + 120, h: Math.max(...rs.map((r) => r.y + r.h)) - y0 + 120 });
  }, [highlight, neighbours, data, fit, fitTo]);

  // Open on the highlighted person's team (or the whole chart if there is none).
  useEffect(() => {
    focusHighlight();
    const onResize = () => focusHighlight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [focusHighlight]);

  const zoomAt = useCallback((factor: number, mx?: number, my?: number) => {
    const el = areaRef.current;
    if (!el) return;
    setView((v) => {
      const cx = mx ?? el.clientWidth / 2, cy = my ?? el.clientHeight / 2;
      const k = Math.min(2.5, Math.max(0.08, v.k * factor));
      const wx = (cx - v.x) / v.k, wy = (cy - v.y) / v.k;
      return { k, x: cx - wx * k, y: cy - wy * k };
    });
  }, []);

  // Scrolling with the pointer over the chart zooms it.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Full screen: the chart fills the window (Esc or the button closes it), keeping the same spot in view.
  const toggleFull = () => {
    const el = areaRef.current;
    if (!el) return;
    const before = { w: el.clientWidth, h: el.clientHeight };
    setFull((f) => !f);
    requestAnimationFrame(() => {
      const after = { w: el.clientWidth, h: el.clientHeight };
      setView((v) => ({ ...v, x: v.x + (after.w - before.w) / 2, y: v.y + (after.h - before.h) / 2 }));
    });
  };
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) toggleFull(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) moved.current = false;
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
        const r = areaRef.current!.getBoundingClientRect();
        zoomAt(dist / pinch.current, (p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top);
      }
      pinch.current = dist;
      return;
    }
    const d = drag.current;
    if (pointers.current.size > 1 || (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5)) moved.current = true;
    if (d) setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };

  const rect = (id: string) => data.nodes.find((n) => n.id === id);
  // While a card is hovered, its reporting lines stand out and everything else fades.
  const focus = hover;
  const related = focus ? neighbours(focus) : new Set<string>();

  return (
    <div className={`org${full ? ' full' : ''}`}>
      <div
        ref={areaRef}
        className="org-area"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ backgroundSize: `${24 * view.k}px ${24 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
        role="img"
        aria-label="Organisation chart"
      >
        <div className="org-layer" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          {data.containers.map((c) => (
            <div key={c.id} className="org-pod" style={{ left: c.x, top: c.y, width: c.w, height: c.h, background: c.bg ?? c.color + '14', borderColor: c.color + '55' }}>
              <span style={{ color: c.color }}>{c.label}</span>
            </div>
          ))}
          <svg className="org-edges" width="1" height="1">
            <defs>
              <marker id="org-arrow" markerWidth="11" markerHeight="11" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4 L0,8 z" fill={NAVY} /></marker>
              <marker id="org-arrow-hl" markerWidth="11" markerHeight="11" refX="8.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L9,4 L0,8 z" fill={PINK} /></marker>
            </defs>
            {data.edges.map((e) => {
              const a = rect(e.from), b = rect(e.to);
              if (!a || !b) return null;
              const on = focus && (e.from === focus || e.to === focus);
              const dim = focus && !on;
              // 'link' edges are a working relationship, not a reporting line: dashed, no arrowhead, and only
              // drawn while one of its cards is hovered so it never reads as part of the reporting structure.
              const link = e.type === 'link';
              if (link && !on) return null;
              return (
                <path key={e.id} d={route(a, b, e.fromSide, e.toSide)} fill="none" stroke={on ? PINK : link ? GREY : NAVY} strokeWidth={on ? 3 : 2}
                  strokeDasharray={link ? '7 6' : undefined} opacity={dim ? 0.25 : 1} markerEnd={link ? undefined : `url(#${on ? 'org-arrow-hl' : 'org-arrow'})`} />
              );
            })}
          </svg>
          {data.nodes.map((n) => {
            const isCeo = n.team === 'ceo', small = !!n.compact, col = n.color ?? GREY;
            const me = n.id === highlight;
            const dim = focus && n.id !== focus && !related.has(n.id);
            const info = partner ? roles?.[n.id] : undefined;
            return (
              <div
                key={n.id}
                className={`org-card${me ? ' me' : ''}${info ? ' has-info' : ''}`}
                onClick={info ? (e) => { if (!moved.current) setOpen({ id: n.id, from: e.currentTarget.getBoundingClientRect() }); } : undefined}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                style={{
                  left: n.x, top: n.y, width: n.w, height: n.h,
                  borderRadius: small ? 12 : 16,
                  border: n.future ? `1.5px dashed ${col}` : `1px solid ${BORDER}`,
                  padding: small ? '7px 10px 7px 15px' : '9px 14px 9px 18px',
                  opacity: dim ? 0.35 : 1,
                  boxShadow: me ? `0 0 0 3px ${PINK}, 0 10px 28px rgba(45,27,105,.18)` : isCeo ? '0 8px 26px rgba(45,27,105,.18)' : '0 4px 14px rgba(45,27,105,.08)',
                }}
              >
                <i style={{ width: isCeo ? 7 : 5, background: isCeo ? CEO_GRAD : col }} />
                {n.future && <b className="org-tag" style={{ background: col }}>{n.tag || 'Future hire'}</b>}
                <div className="org-name" style={{ fontSize: isCeo ? 17 : small ? 12.5 : 14.5, fontWeight: isCeo ? 800 : 700 }}>{n.name}</div>
                <div className="org-role" style={{ fontSize: small ? 11 : 11.5 }}>{n.role}</div>
              </div>
            );
          })}
        </div>
      </div>
      {scheme && (
        <button type="button" className="org-scheme-btn" onClick={() => setShowScheme(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /><path d="M8 4v4M15 10v4M11 16v4" /></svg>
          Show Ownership Scheme
        </button>
      )}
      {showScheme && scheme && <OwnershipSchemeView scheme={scheme} onClose={closeScheme} />}
      <div className="org-controls">
        {highlight && <button type="button" onClick={focusHighlight}>My Team</button>}
        <button type="button" onClick={fit}>Fit</button>
        <button type="button" onClick={() => zoomAt(1.25)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomAt(0.8)} aria-label="Zoom out">−</button>
        <button type="button" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen (Esc)' : 'Full screen'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
          </svg>
        </button>
      </div>
      <p className="org-hint">
        Drag to move around · Scroll or pinch to zoom · Hover a card to see its reporting lines
        {partner && roles && Object.keys(roles).length > 0 && <> · Click a card to see how it works with the {partner.role}</>}
      </p>
      {open && partner && roles?.[open.id] && (() => {
        const person = data.nodes.find((n) => n.id === open.id)!;
        return <OrgCollab person={person} partner={partner} info={roles[open.id]} from={open.from} onClose={closeCollab} />;
      })()}
    </div>
  );
}
