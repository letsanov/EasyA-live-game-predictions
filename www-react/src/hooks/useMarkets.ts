import { useState, useEffect, useCallback } from 'react';
import { useMarketContract } from './useMarketContract';
import { useWallet } from '@/contexts/WalletContext';

export function useMarkets() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getMarketsPage, isConnected } = useMarketContract();
  const { chainId } = useWallet();

  const fetchMarkets = useCallback(async () => {
    if (!isConnected || chainId !== 1337) {
      setMarkets([]);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getMarketsPage(0, 100);
      setMarkets(result.markets);
    } catch {
      // Wrong network or contract not deployed - silently ignore
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  return {
    markets,
    isLoading,
    refetch: fetchMarkets,
  };
}
