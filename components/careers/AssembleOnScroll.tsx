'use client';

import { useEffect, useRef } from 'react';

/*
 * Wraps the benefits collage. As the section scrolls into view, each card and photo slides into its place
 * from the side it sits on (left column from the left, right column from the right, middle from below),
 * tied to the scroll position so it reverses when scrolling back up.
 */
export function AssembleOnScroll({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = [...root.children] as HTMLElement[];
    const from = items.map((el) => {
      const col = parseInt(getComputedStyle(el).gridColumnStart, 10) || 5;
      return col < 5 ? [-1, 0] : col >= 8 ? [1, 0] : [0, 1];
    });
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      // Phones show the benefits differently; the collage only exists on wider screens.
      if (root.offsetParent === null) return;
      items.forEach((el, i) => {
        el.style.transform = '';
        const top = el.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.55)));
        const e = 1 - (1 - p) ** 3; // ease out
        const [dx, dy] = from[i];
        el.style.transform = p >= 1 ? '' : `translate3d(${dx * (1 - e) * 220}px, ${dy * (1 - e) * 160}px, 0)`;
        el.style.opacity = String(0.15 + 0.85 * e);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
}
