import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { useMarkets, MarketData } from "@/hooks/useMarkets";
import { useMarketContract } from "@/hooks/useMarketContract";
import { useWallet } from "@/contexts/WalletContext";
import { formatUnits } from "ethers";
import { toast } from "sonner";
import { Trophy, Loader2, Coins, Timer, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface MarketPosition {
  market: MarketData;
  totalAmount: bigint;
  claimed: boolean;
  isWinner: boolean;
  threadMatchId: string | null;
}

function formatTimeLeft(deadlineUnix: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadlineUnix - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const MarketRow = ({
  pos,
  now,
  onClaim,
  claiming,
}: {
  pos: MarketPosition;
  now: number;
  onClaim: (marketId: number) => void;
  claiming: boolean;
}) => {
  // Extract player name and question separately
  const newFmtMatch = pos.market.name.match(/^(.+?)\s*\[\d+\](?:\s*\{.+?\})?\s*:\s*(.*)/);
  const oldFmtMatch = !newFmtMatch ? pos.market.name.match(/^Match \d+:\s*(.*)/) : null;
  const playerName = newFmtMatch ? newFmtMatch[1] : null;
  const question = newFmtMatch ? newFmtMatch[2] : oldFmtMatch ? oldFmtMatch[1] : pos.market.name;
  const amountUsd = Number(formatUnits(pos.totalAmount, 6));
  const isOpen = now < pos.market.predictionDeadline && !pos.market.isResolved && !pos.market.isCancelled;

  let status: 'open' | 'pending' | 'won' | 'lost' | 'cancelled' | 'claimed' = 'open';
  if (pos.claimed) status = 'claimed';
  else if (pos.market.isCancelled) status = 'cancelled';
  else if (pos.market.isResolved) status = pos.isWinner ? 'won' : 'lost';
  else if (!isOpen) status = 'pending'; // deadline passed, awaiting resolution

  const linkTo = pos.threadMatchId ? `/thread/${pos.threadMatchId}` : '#';
  const canClaim = status === 'won' || status === 'cancelled';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
      status === 'won' ? 'border-[hsl(var(--yes))]/30 bg-[hsl(var(--yes))]/5' :
      status === 'lost' ? 'border-destructive/20 bg-destructive/5' :
      status === 'claimed' ? 'border-primary/20 bg-primary/5' :
      'border-border bg-card'
    }`}>
      <Link to={linkTo} className="text-sm text-foreground hover:text-primary transition-colors flex-1 min-w-0 truncate">
        {playerName && <span className="font-semibold">{playerName}: </span>}{question}
      </Link>

      <span className="text-xs font-mono text-muted-foreground shrink-0">
        ${amountUsd.toFixed(2)}
      </span>

      <div className="shrink-0 w-24 text-right">
        {status === 'open' && (
          <span className="flex items-center justify-end gap-1 text-[10px] font-mono text-amber-400">
            <Timer className="w-3 h-3" />
            {formatTimeLeft(pos.market.predictionDeadline)}
          </span>
        )}
        {status === 'pending' && (
          <span className="text-[10px] font-semibold text-muted-foreground">RESOLVING</span>
        )}
        {status === 'won' && (
          <span className="text-[10px] font-semibold text-[hsl(var(--yes))]">WON</span>
        )}
        {status === 'lost' && (
          <span className="text-[10px] font-semibold text-destructive">LOST</span>
        )}
        {status === 'claimed' && (
          <span className="flex items-center justify-end gap-1 text-[10px] font-semibold text-primary">
            <Check className="w-3 h-3" /> CLAIMED
          </span>
        )}
        {status === 'cancelled' && !canClaim && (
          <span className="text-[10px] font-semibold text-muted-foreground">CANCELLED</span>
        )}
      </div>

      <div className="shrink-0 w-20">
        {canClaim && (
          <Button
            size="sm"
            variant={status === 'cancelled' ? 'secondary' : 'default'}
            onClick={() => onClaim(pos.market.id)}
            disabled={claiming}
            className="h-7 text-xs gap-1 w-full"
          >
            {claiming ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Coins className="w-3 h-3" />
                {status === 'cancelled' ? 'Refund' : 'Claim'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

const MyPredictions = () => {
  const { markets } = useMarkets();
  const { getUserPrediction, hasClaimed: checkClaimed, claimPayout } = useMarketContract();
  const { account } = useWallet();
  const [positions, setPositions] = useState<MarketPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  // Scan all markets — aggregate per market (not per outcome)
  useEffect(() => {
    if (!account || markets.length === 0) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    const scan = async () => {
      setIsLoading(true);
      const found: MarketPosition[] = [];

      for (const market of markets) {
        let totalAmount = 0n;
        let hasPosition = false;
        let isWinner = false;

        for (let oi = 0; oi < market.outcomes.length; oi++) {
          try {
            const amount = await getUserPrediction(market.id, oi, account);
            if (amount > 0n) {
              hasPosition = true;
              totalAmount += amount;
              if (market.isResolved && market.winningOutcome === oi) {
                isWinner = true;
              }
            }
          } catch {
            // Skip
          }
        }

        if (hasPosition) {
          const claimed = await checkClaimed(account, market.id);
          const newFmt = market.name.match(/\[(\d+)\]:/);
          const oldFmt = !newFmt ? market.name.match(/^Match (\d+):/) : null;
          const threadMatchId = newFmt ? newFmt[1] : oldFmt ? oldFmt[1] : null;

          found.push({ market, totalAmount, claimed, isWinner, threadMatchId });
        }
      }

      setPositions(found);
      setIsLoading(false);
    };

    scan();
  }, [account, markets]);

  const handleClaim = async (marketId: number) => {
    setClaimingId(marketId);
    try {
      await claimPayout(marketId);
      toast.success('Payout claimed!');
      setPositions((prev) =>
        prev.map((p) => p.market.id === marketId ? { ...p, claimed: true } : p)
      );
    } catch (error) {
      console.error('Claim failed:', error);
      toast.error('Claim failed. Check console for details.');
    } finally {
      setClaimingId(null);
    }
  };

  const totalStaked = positions.reduce((sum, p) => sum + Number(formatUnits(p.totalAmount, 6)), 0);
  const claimable = positions.filter((p) => (p.isWinner || p.market.isCancelled) && !p.claimed);

  return (
    <div className="min-h-screen bg-background gradient-radial">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary" />
            My Predictions
          </h1>
          <p className="text-muted-foreground">
            Markets you've participated in
          </p>
        </div>

        {!account ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Connect your wallet to view your predictions</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Scanning your predictions...</p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex items-center gap-6 rounded-xl border border-border bg-card px-6 py-4 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Markets</p>
                <p className="text-xl font-bold font-mono text-foreground">{positions.length}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Staked</p>
                <p className="text-xl font-bold font-mono text-foreground">${totalStaked.toFixed(2)}</p>
              </div>
              {claimable.length > 0 && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--yes))]">Claimable</p>
                    <p className="text-xl font-bold font-mono text-[hsl(var(--yes))]">{claimable.length}</p>
                  </div>
                </>
              )}
            </div>

            {/* Markets list */}
            <div className="space-y-2">
              {positions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  No predictions yet. Go place some!
                </div>
              ) : (
                positions.map((pos) => (
                  <MarketRow
                    key={pos.market.id}
                    pos={pos}
                    now={now}
                    onClaim={handleClaim}
                    claiming={claimingId === pos.market.id}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MyPredictions;
