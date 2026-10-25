'use client';

import { useEffect, useRef, useState } from 'react';

type Person = { name: string; role?: string; photo: string; quote?: string };

/*
 * A row of team cards that drifts sideways on its own and slides faster as the page scrolls
 * (left when scrolling down, back when scrolling up). The row is drawn twice and wraps after exactly
 * one copy (cards plus the gap before the second copy), so the loop has no visible jump.
 * Clicking a card stops the row and shows that person's quote; clicking it again (or elsewhere) lets it move on.
 */
export function PeopleMarquee({ people }: { people: Person[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const paused = useRef(false);
  paused.current = active !== null;

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = 0, last = window.scrollY, raf = 0;
    const step = () => {
      const dy = window.scrollY - last;
      last = window.scrollY;
      if (!paused.current) {
        const first = el.children[0] as HTMLElement | undefined;
        const second = el.children[people.length] as HTMLElement | undefined;
        const period = first && second ? second.offsetLeft - first.offsetLeft : 0;
        x -= 0.35 + dy * 0.6;
        if (period > 0) {
          while (x <= -period) x += period;
          while (x > 0) x -= period;
        }
        el.style.transform = `translate3d(${x}px, 0, 0)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [people.length]);

  // Clicking anywhere outside the open card closes it and lets the row move again.
  useEffect(() => {
    if (!active) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest?.('.cr-person')) setActive(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [active]);

  return (
    <div className="cr-marquee">
      <div className="cr-track" ref={track}>
        {[0, 1].map((copy) =>
          people.map((p) => {
            const id = `${copy}-${p.name}`;
            const open = active === id;
            return (
              <figure key={id} className={`cr-person${open ? ' open' : ''}`} aria-hidden={copy === 1 || undefined}>
                <button
                  type="button"
                  className="cr-person-btn"
                  tabIndex={copy === 1 ? -1 : 0}
                  aria-expanded={open}
                  aria-label={`${p.name}${p.quote ? ': read their quote' : ''}`}
                  onClick={() => setActive(open ? null : id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt={copy === 0 ? p.name : ''} loading="lazy" />
                </button>
                <figcaption>
                  <b>{p.name}</b>
                  {p.role && <span>{p.role}</span>}
                  {open && p.quote && <q>{p.quote}</q>}
                </figcaption>
              </figure>
            );
          }),
        )}
      </div>
    </div>
  );
}
