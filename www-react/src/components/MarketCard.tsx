import { Link } from 'react-router-dom';

interface MarketCardProps {
  marketId: number;
  title: string;
  outcomes: string[];
  poolAmounts?: number[];
  totalPool?: number;
  deadline?: number;
}

export default function MarketCard({
  marketId,
  title,
  outcomes,
  poolAmounts = [],
  totalPool = 0,
}: MarketCardProps) {
  // Calculate percentages (no logic yet, just layout)
  const calculatePercentage = (index: number) => {
    if (!poolAmounts[index] || totalPool === 0) return 50;
    return (poolAmounts[index] / totalPool) * 100;
  };

  return (
    <Link to={`/market/${marketId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card">
        <h3>{title}</h3>
        <p style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
          Market #{marketId}
        </p>

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          {outcomes.slice(0, 2).map((outcome, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                padding: '12px',
                background: '#1a1a1a',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#666' }}>{outcome}</div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>
                {calculatePercentage(index).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
          Total Pool: ${totalPool.toFixed(2)}
        </div>
      </div>
    </Link>
  );
}
