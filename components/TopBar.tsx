import { ThemeToggle } from './ThemeToggle';

/**
 * Shared header: the logo always sits on the right, next to the theme switch.
 * `left` holds page-specific content (timer, back link); `right` sits before the switch.
 */
export function TopBar({ left, right, wide, progress }: { left?: React.ReactNode; right?: React.ReactNode; wide?: boolean; progress?: number }) {
  return (
    <header className="topbar">
      <div className={`topbar-inner${wide ? ' wide' : ''}${left ? ' split' : ''}`}>
        {left}
        <div className="topbar-right">
          {right}
          <ThemeToggle />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo logo-light" src="/logo-horizontal.png" alt="House of Marketers" width={138} height={28} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo logo-dark" src="/logo-horizontal-white.png" alt="House of Marketers" width={138} height={28} />
        </div>
      </div>
      {progress !== undefined && (
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </header>
  );
}
