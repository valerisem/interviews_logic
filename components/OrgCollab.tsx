'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { OrgNode, OrgRoleInfo } from './OrgChart';

/*
 * Opens when an org-chart card is clicked. The clicked card pops out of the chart towards the viewer into its
 * own side panel with what that role owns; the job's own card (e.g. Head of Operations) flies in from the left.
 * Between them, arrows take turns running each way, and the shared work and where the line sits sit
 * under the arrows — the collaboration zone, kept apart from what the role owns on its own.
 */

const PINK = '#F0438F', PUR = '#8B5CF6', NAVY = '#0B0E1A', GREY = '#6B7280';
const CEO_GRAD = `linear-gradient(135deg, ${NAVY} 0%, ${PUR} 45%, ${PINK} 100%)`;

// Partner card on the left, clicked card on the right.
const TOP = 'M 14 50 C 80 4, 160 4, 226 50';
const BOTTOM = 'M 226 90 C 160 136, 80 136, 14 90';
const CYCLE = '3.2s';

function Card({ node, me, cardRef }: { node: OrgNode; me?: boolean; cardRef: React.Ref<HTMLDivElement> }) {
  const isCeo = node.team === 'ceo', col = node.color ?? GREY;
  return (
    <div ref={cardRef} className={`collab-card${me ? ' me' : ''}${node.future ? ' future' : ''}`} style={node.future ? { borderColor: col } : undefined}>
      <i style={{ background: isCeo ? CEO_GRAD : col }} />
      {node.future && <b className="org-tag" style={{ background: col }}>{node.tag || 'Future hire'}</b>}
      <div className="collab-name">{node.name}</div>
      <div className="collab-role">{node.role}</div>
    </div>
  );
}

/** One direction of the line: a faint track, a flowing dash and an arrowhead with a short trail. */
function Flow({ d, color, first }: { d: string; color: string; first: boolean }) {
  // Each direction is active for half the cycle, then hands over to the other.
  const keyPoints = first ? '0;1;1' : '0;0;1';
  const fade = first ? { values: '0;1;1;0;0', keyTimes: '0;0.06;0.44;0.5;1' } : { values: '0;0;1;1;0', keyTimes: '0;0.5;0.56;0.94;1' };
  const glow = first ? { values: '1;1;0.25;0.25;1', keyTimes: '0;0.46;0.54;0.96;1' } : { values: '0.25;0.25;1;1;0.25', keyTimes: '0;0.46;0.54;0.96;1' };
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={6} strokeLinecap="round" />
      <path className="collab-dash" d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 10">
        <animate attributeName="stroke-opacity" dur={CYCLE} repeatCount="indefinite" {...glow} />
      </path>
      {[0.16, 0.08, 0].map((lag, i) => (
        <g key={i} opacity={0}>
          {i === 2 ? <path d="M -7 -7 L 8 0 L -7 7 z" fill={color} /> : <circle r={i === 0 ? 2.5 : 3.5} fill={color} />}
          <animateMotion dur={CYCLE} begin={`${lag}s`} repeatCount="indefinite" rotate="auto" path={d} keyPoints={keyPoints} keyTimes="0;0.5;1" calcMode="linear" />
          <animate attributeName="opacity" dur={CYCLE} begin={`${lag}s`} repeatCount="indefinite" {...fade} />
        </g>
      ))}
    </g>
  );
}

export function OrgCollab({ person, partner, info, from, onClose }: {
  person: OrgNode;
  partner: OrgNode;
  info: OrgRoleInfo;
  /** Where the clicked card was on screen, so it can grow out of that spot. */
  from: DOMRect;
  onClose: () => void;
}) {
  const personRef = useRef<HTMLDivElement>(null);
  const partnerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The highlighted person's own card: just their role, no partner or arrows.
  const solo = person.id === partner.id;
  // A to-be-hired or category card's name is the role (its role field just says “To be hired”).
  const roleName = person.future ? person.name : person.role;

  useLayoutEffect(() => {
    const p = personRef.current, q = partnerRef.current;
    if (!p || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = p.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (t.left + t.width / 2), dy = from.top + from.height / 2 - (t.top + t.height / 2);
    const s = Math.max(0.2, from.width / t.width);
    const anims = [
      p.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${s})`, boxShadow: '0 4px 14px rgba(45,27,105,.08)' },
          // Lifts off the chart, comes right up towards the viewer, then settles into place.
          { transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(${Math.max(s, 1) * 1.15})`, boxShadow: '0 22px 50px rgba(45,27,105,.3)', offset: 0.35 },
          { transform: 'translate(0, 0) scale(1.28)', boxShadow: '0 40px 80px rgba(45,27,105,.4)', offset: 0.7 },
          { transform: 'none', boxShadow: '0 14px 34px rgba(45,27,105,.2)' },
        ],
        { duration: 1000, easing: 'cubic-bezier(.25,.8,.3,1)', fill: 'backwards' },
      ),
      q?.animate(
        [
          { transform: 'translateX(-70vw) rotate(-10deg)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 800, delay: 650, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'backwards' },
      ),
    ];
    return () => anims.forEach((a) => a?.cancel());
  }, [from]);

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

  return createPortal(
    <div className="collab" onClick={onClose}>
      <div className="collab-panel" role="dialog" aria-modal="true" aria-labelledby="collab-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="collab-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <p className="collab-eyebrow">{solo ? 'How the role works' : 'How they work together'}</p>
        <h2 id="collab-title" className="collab-title">
          {solo ? roleName : <>{roleName} <span className="accent">×</span> {partner.role}</>}
        </h2>

        <div className={`collab-body${solo ? ' solo' : ''}`}>
          <div className="collab-together">
            <p className="collab-zone">{solo ? 'Across the business' : 'Working together'}</p>
            <div className="collab-pair">
              {!solo && <Card node={partner} me cardRef={partnerRef} />}
              {!solo && (
                <svg className="collab-arrows" viewBox="0 0 240 140" aria-hidden="true">
                  <Flow d={TOP} color={PINK} first />
                  <Flow d={BOTTOM} color={PUR} first={false} />
                </svg>
              )}
              <Card node={person} me={solo} cardRef={personRef} />
            </div>
            <section className="collab-works">
              <h3>{info.labels?.works ?? `Works with ${partner.role} on`}</h3>
              <p>{info.works}</p>
            </section>
          </div>
          <aside className="collab-side" style={{ '--c': person.color ?? GREY } as React.CSSProperties}>
            <h3 className="collab-side-title">{info.labels?.side ?? `${roleName} role`}</h3>
            <section>
              <h4>{info.labels?.owns ?? 'Owns'}</h4>
              <p>{info.owns}</p>
            </section>
            <section>
              <h4>Where the line sits</h4>
              <p>{info.line}</p>
            </section>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
