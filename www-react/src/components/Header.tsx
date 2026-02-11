import { Link } from 'react-router-dom';

interface HeaderProps {
  showCreateButton?: boolean;
}

export default function Header({ showCreateButton = true }: HeaderProps) {
  return (
    <header className="header">
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1>🎮 Live Game Predictions</h1>
      </Link>
      <div className="header-actions">
        {showCreateButton && (
          <Link to="/create">
            <button className="btn btn-primary">Create Market</button>
          </Link>
        )}
        <button className="btn btn-secondary">Connect Wallet</button>
      </div>
    </header>
  );
}
