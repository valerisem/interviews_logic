export function TopBar({ children, wide, progress }: { children?: React.ReactNode; wide?: boolean; progress?: number }) {
  return (
    <header className="topbar">
      <div className={`topbar-inner${wide ? ' wide' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/logo-horizontal.png" alt="House of Marketers" width={138} height={28} />
        {children}
      </div>
      {progress !== undefined && (
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </header>
  );
}
