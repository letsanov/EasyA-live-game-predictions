import { useWallet } from '../contexts/WalletContext';

export default function ConnectWallet() {
  const { account, isConnecting, connect, disconnect } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (account) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-secondary"
          onClick={disconnect}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#4ade80',
            }}
          />
          {formatAddress(account)}
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={connect}
      disabled={isConnecting}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
