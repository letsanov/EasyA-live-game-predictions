import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMarketContract } from './useMarketContract';
import { useWallet } from '@/contexts/WalletContext';
import { formatUnits } from 'ethers';

export interface MarketData {
  id: number;
  name: string;
  outcomes: string[];
  creator: string;
  oracle: string;
  predictionDeadline: number;
  isResolved: boolean;
  isCancelled: boolean;
  winningOutcome: number;
  totalPoolAmount: bigint;
  poolAmounts: bigint[];
  creationTimestamp: number;
}

export interface HistoryPoint {
  time: string; // "HH:MM:SS"
  timestamp: number;
  percentages: Record<string, number>; // outcomeIndex → percentage
}

export interface MarketHistory {
  [marketId: number]: HistoryPoint[];
}

export interface Thread {
  threadKey: string;       // unique key for grouping
  playerName: string;      // "Topson"
  dotaMatchId: string;     // "7913368966"
  streamUrl: string | null; // "https://twitch.tv/gorgc"
  title: string;           // "Topson"
  markets: MarketData[];
  totalPool: bigint;
  isOpen: boolean;
  creationTimestamp: number;
}

function groupIntoThreads(markets: MarketData[]): Thread[] {
  const threadMap = new Map<string, MarketData[]>();
  const now = Math.floor(Date.now() / 1000);

  for (const market of markets) {
    // Parse "PlayerName [matchId] {streamUrl}: Question" or "PlayerName [matchId]: Question" or "Match matchId: Question"
    const newFmt = market.name.match(/^(.+?)\s*\[(\d+)\](?:\s*\{(.+?)\})?\s*:/);
    const oldFmt = !newFmt ? market.name.match(/^Match (\d+):/) : null;
    const key = newFmt
      ? `${newFmt[1]}__${newFmt[2]}`
      : oldFmt
      ? `Match ${oldFmt[1]}__${oldFmt[1]}`
      : `standalone-${market.id}`;

    if (!threadMap.has(key)) {
      threadMap.set(key, []);
    }
    threadMap.get(key)!.push(market);
  }

  return Array.from(threadMap.entries()).map(([threadKey, threadMarkets]) => {
    const totalPool = threadMarkets.reduce(
      (sum, m) => sum + m.totalPoolAmount,
      0n
    );
    const isOpen = threadMarkets.some(
      (m) => now < m.predictionDeadline && !m.isResolved && !m.isCancelled
    );
    const creationTimestamp = Math.min(
      ...threadMarkets.map((m) => m.creationTimestamp)
    );

    // Parse player name and match ID from key "PlayerName__matchId"
    const parts = threadKey.split('__');
    const playerName = parts.length === 2 ? parts[0] : threadKey;
    const dotaMatchId = parts.length === 2 ? parts[1] : '';

    // Extract stream URL from any market name containing {url}
    let streamUrl: string | null = null;
    for (const m of threadMarkets) {
      const urlMatch = m.name.match(/\{(.+?)\}/);
      if (urlMatch) {
        streamUrl = urlMatch[1];
        break;
      }
    }

    return {
      threadKey,
      playerName,
      dotaMatchId,
      streamUrl,
      title: playerName,
      markets: threadMarkets,
      totalPool,
      isOpen,
      creationTimestamp,
    };
  }).sort((a, b) => b.creationTimestamp - a.creationTimestamp);
}

function computePercentages(market: MarketData): Record<string, number> {
  const totalPool = Number(formatUnits(market.totalPoolAmount, 6));
  const pcts: Record<string, number> = {};
  market.outcomes.forEach((outcome, i) => {
    const poolAmt = Number(formatUnits(market.poolAmounts[i] || 0n, 6));
    pcts[String(i)] = totalPool > 0 ? Math.round((poolAmt / totalPool) * 100) : 0;
  });
  return pcts;
}

const MAX_HISTORY_POINTS = 360; // ~1 hour at 10s intervals

export function useMarkets() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<MarketHistory>({});
  const { getMarketsPage, isConnected } = useMarketContract();
  const { chainId } = useWallet();
  const prevSnapshotRef = useRef<Record<number, string>>({});

  const fetchMarkets = useCallback(async () => {
    if (!isConnected || chainId !== 1337) {
      setMarkets([]);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getMarketsPage(0, 100);
      setMarkets(result.markets);

      // Record history snapshot
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setHistory((prev) => {
        const next = { ...prev };
        for (const market of result.markets) {
          const pcts = computePercentages(market);
          const pctKey = JSON.stringify(pcts);

          // Always record first 2 points so chart renders, then only on change
          const prevKey = prevSnapshotRef.current[market.id];
          const pointCount = next[market.id]?.length ?? 0;
          if (prevKey === pctKey && pointCount >= 2) continue;

          prevSnapshotRef.current[market.id] = pctKey;

          if (!next[market.id]) {
            next[market.id] = [];
          }
          next[market.id] = [
            ...next[market.id],
            { time: timeLabel, timestamp: now.getTime(), percentages: pcts },
          ].slice(-MAX_HISTORY_POINTS);
        }
        return next;
      });
    } catch {
      // Wrong network or contract not deployed
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  const threads = useMemo(() => groupIntoThreads(markets), [markets]);

  return {
    markets,
    threads,
    history,
    isLoading,
    refetch: fetchMarkets,
  };
}
