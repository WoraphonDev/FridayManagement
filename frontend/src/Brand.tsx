export function Brand() {
  return (
    <span className="friday-brand">
      <svg className="brand-symbol" aria-hidden="true" viewBox="0 0 36 36" fill="none">
        <g transform="rotate(-9 18 18)">
          <rect className="brand-tile" x="3" y="4" width="13" height="13" rx="4.5" fill="#54ca94" />
          <rect className="brand-tile" x="20" y="4" width="13" height="13" rx="4.5" fill="#ffd66d" />
          <rect className="brand-tile" x="3" y="21" width="13" height="13" rx="4.5" fill="#ff7896" />
          <rect className="brand-tile" x="20" y="21" width="13" height="13" rx="4.5" fill="#a67cea" />
        </g>
      </svg>
      <span className="brand-wordmark">
        <span className="brand-name">
          fr<b className="brand-i">i</b>day<i aria-hidden="true" />
        </span>
        <small>Work management</small>
      </span>
    </span>
  );
}
export function AuthArtwork() {
  return (
    <aside className="auth-artwork" aria-label="Work together">
      <div className="auth-copy">
        <p className="eyebrow">MAKE ROOM FOR GREAT WORK</p>
        <h2>
          Clear work
          <br />
          Move forward together
        </h2>
        <p>
          Tasks, owners and deadlines
          <br />
          in one place your team can call home
        </p>
      </div>
      <div className="auth-board" aria-hidden="true">
        <div className="art-board-head">
          <strong>Website Relaunch</strong>
          <span className="art-team">Digital team</span>
        </div>
        <div className="art-tabs">
          <span>▤ Main table</span>
          <span>▥ Kanban</span>
          <span>▦ Calendar</span>
        </div>
        {['Design the website', 'Review colors and UI', 'Set up project structure'].map(
          (title, i) => (
            <div className="art-row" key={title}>
              <span>{title}</span>
              <span className={`art-avatar art-avatar-${i}`}>{['MN', 'PR', 'TN'][i]}</span>
              <span className={`art-status art-status-${i}`}>
                {['Working on it', 'In review', 'Done'][i]}
              </span>
            </div>
          ),
        )}
        <div className="art-success">
          <span className="art-success-orb">✓</span>
          <div>
            <strong>One more task completed</strong>
            <p>Every step counts</p>
          </div>
        </div>
      </div>
      <div className="auth-credit">
        <span>✓ Organize work in multiple views</span>
        <span>✓ Access follows team permissions</span>
      </div>
    </aside>
  );
}
