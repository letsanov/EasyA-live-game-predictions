import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      {/* Header */}
      <header className="header">
        <h1>🎮 Live Game Predictions</h1>
        <div className="header-actions">
          <Link to="/create">
            <button className="btn btn-primary">Create Market</button>
          </Link>
          <button className="btn btn-secondary">Connect Wallet</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container">
        <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Active Markets</h2>

        {/* Markets Grid */}
        <div className="markets-grid">
          {/* Placeholder cards - no logic yet */}
          <div className="card">
            <h3>Market Title</h3>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
              Sample market description
            </p>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Outcome A</div>
                <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>50%</div>
              </div>
              <div style={{ flex: 1, padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Outcome B</div>
                <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>50%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State (shown when no markets) */}
        {/* <div className="empty-state">
          <h3>No active markets</h3>
          <p>Be the first to create a prediction market!</p>
          <Link to="/create">
            <button className="btn btn-primary">Create Market</button>
          </Link>
        </div> */}
      </div>
    </div>
  );
}
