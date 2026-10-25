'use client';

import { useEffect, useRef } from 'react';

/*
 * A row of team cards that drifts sideways on its own and slides faster as the page scrolls
 * (left when scrolling down, back when scrolling up). The row is drawn twice so it loops seamlessly.
 */
export function PeopleMarquee({ people }: { people: { name: string; role?: string; photo: string }[] }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = 0, last = window.scrollY, raf = 0;
    const step = () => {
      const dy = window.scrollY - last;
      last = window.scrollY;
      const half = el.scrollWidth / 2;
      x -= 0.35 + dy * 0.6;
      if (half > 0) x = (((x % half) - half) % half);
      el.style.transform = `translate3d(${x}px, 0, 0)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="cr-marquee">
      <div className="cr-track" ref={track}>
        {[0, 1].map((copy) =>
          people.map((p) => (
            <figure key={`${copy}-${p.name}`} className="cr-person" aria-hidden={copy === 1 || undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt={copy === 0 ? p.name : ''} loading="lazy" />
              <figcaption>
                <b>{p.name}</b>
                {p.role && <span>{p.role}</span>}
              </figcaption>
            </figure>
          )),
        )}
      </div>
    </div>
  );
}
