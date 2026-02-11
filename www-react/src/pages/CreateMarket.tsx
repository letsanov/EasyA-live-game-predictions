import { Link } from 'react-router-dom';

export default function CreateMarket() {
  return (
    <div>
      {/* Header */}
      <header className="header">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1>🎮 Live Game Predictions</h1>
        </Link>
        <div className="header-actions">
          <Link to="/">
            <button className="btn btn-secondary">Cancel</button>
          </Link>
          <button className="btn btn-secondary">Connect Wallet</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container">
        <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Create New Market</h2>

        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form>
            <div className="form-group">
              <label>Market Question</label>
              <input
                type="text"
                placeholder="e.g., Will Team A win the match?"
              />
            </div>

            <div className="form-group">
              <label>Outcome 1</label>
              <input
                type="text"
                placeholder="e.g., Yes"
              />
            </div>

            <div className="form-group">
              <label>Outcome 2</label>
              <input
                type="text"
                placeholder="e.g., No"
              />
            </div>

            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                placeholder="60"
                defaultValue="60"
              />
            </div>

            <div className="form-group">
              <label>Oracle Address</label>
              <input
                type="text"
                placeholder="0x..."
              />
            </div>

            <div className="form-group">
              <label>Initial Bet (Optional)</label>
              <input
                type="number"
                placeholder="0"
                step="0.01"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px' }}
            >
              Create Market
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
