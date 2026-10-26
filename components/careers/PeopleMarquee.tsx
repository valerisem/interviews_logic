'use client';

import { useEffect, useRef } from 'react';

type Person = { name: string; role: string; photo: string; linkedin?: string };

/*
 * A row of team cards that slides sideways at a steady speed, whatever the mouse or scroll does. The row is
 * drawn twice and wraps after exactly one copy (cards plus the gap before the second copy), so the loop has
 * no visible jump. Each person is cut out from their background and tinted fuchsia (the #cr-duotone filter
 * below); hovering a card brings their colour back.
 */
export function PeopleMarquee({ people }: { people: Person[] }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = 0, prev = 0, raf = 0;
    const step = (now: number) => {
      // Same speed on every screen: 30px a second, measured by time rather than by frame.
      const dt = prev ? Math.min(now - prev, 100) : 0;
      prev = now;
      const first = el.children[0] as HTMLElement | undefined;
      const second = el.children[people.length] as HTMLElement | undefined;
      const period = first && second ? second.offsetLeft - first.offsetLeft : 0;
      x -= dt * 0.03;
      if (period > 0) {
        while (x <= -period) x += period;
        while (x > 0) x -= period;
      }
      el.style.transform = `translate3d(${x}px, 0, 0)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [people.length]);

  return (
    <div className="cr-marquee">
      {/* Fuchsia duotone: dark tones become brand pink, light tones a pale pink. Transparency is kept. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="cr-duotone" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.80 1" />
            <feFuncG type="table" tableValues="0.13 0.90" />
            <feFuncB type="table" tableValues="0.42 0.94" />
          </feComponentTransfer>
        </filter>
      </svg>
      <div className="cr-track" ref={track}>
        {[0, 1].map((copy) =>
          people.map((p) => (
            <figure key={`${copy}-${p.name}`} className="cr-person" aria-hidden={copy === 1 || undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt={copy === 0 ? p.name : ''} loading="lazy" />
              <figcaption>
                <span className="cr-person-text">
                  <b>{p.name}</b>
                  <span>{p.role}</span>
                </span>
                {p.linkedin && (
                  <a className="cr-linkedin" href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} on LinkedIn`} tabIndex={copy === 1 ? -1 : undefined}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z" /></svg>
                  </a>
                )}
              </figcaption>
            </figure>
          )),
        )}
      </div>
    </div>
  );
}
