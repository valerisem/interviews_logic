export function TopBar({ children, wide, progress }: { children?: React.ReactNode; wide?: boolean; progress?: number }) {
  return (
    <header className="topbar">
      <div className={`topbar-inner${wide ? ' wide' : ''}`}>
        <div className="wordmark">HOUSE OF MARKETERS</div>
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
