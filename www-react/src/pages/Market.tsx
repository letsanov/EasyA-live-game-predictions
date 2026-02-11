import { Link, useParams } from 'react-router-dom';

export default function Market() {
  const { marketId } = useParams();

  return (
    <div>
      {/* Header */}
      <header className="header">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1>🎮 Live Game Predictions</h1>
        </Link>
        <div className="header-actions">
          <button className="btn btn-secondary">Connect Wallet</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container">
        <div style={{ marginTop: '40px', maxWidth: '800px', margin: '40px auto 0' }}>
          {/* Back button */}
          <Link to="/" style={{ textDecoration: 'none', color: '#3b82f6', fontSize: '14px' }}>
            ← Back to Markets
          </Link>

          {/* Market Info */}
          <div className="card" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h2>Market Question Goes Here</h2>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
                  Market ID: {marketId}
                </p>
              </div>
              <div style={{
                padding: '8px 16px',
                background: '#1a4d2e',
                color: '#4ade80',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                ACTIVE
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Pool</div>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>$0.00</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Ends In</div>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>--:--</div>
              </div>
            </div>
          </div>

          {/* Outcomes */}
          <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Outcome A</h3>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Pool: $0.00</p>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#3b82f6' }}>50%</div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <input
                  type="number"
                  placeholder="Amount to bet"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                />
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  Place Bet
                </button>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Outcome B</h3>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Pool: $0.00</p>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#3b82f6' }}>50%</div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <input
                  type="number"
                  placeholder="Amount to bet"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                />
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  Place Bet
                </button>
              </div>
            </div>
          </div>

          {/* Your Bets */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Your Bets</h3>
            <div className="empty-state">
              <p>You haven't placed any bets on this market yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
