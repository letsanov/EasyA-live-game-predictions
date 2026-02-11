import Header from "@/components/Header";
import { useMarkets } from "@/hooks/useMarkets";
import { useWallet } from "@/contexts/WalletContext";
import { MOCK_STREAMS } from "@/lib/types";
import { Swords, TrendingUp, Clock, Loader2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { formatUnits } from "ethers";

// Reference mock stream (Gorgc)
const MOCK_STREAM = MOCK_STREAMS[0];

const MockStreamCard = () => (
  <Link to={`/match/${MOCK_STREAM.id}`} className="block group">
    <div className="rounded-xl border border-border bg-card p-5 h-full transition-all duration-300 hover:border-glow group-hover:glow-primary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{MOCK_STREAM.streamer.avatar}</span>
          <div>
            <span className="text-xs font-semibold text-foreground">{MOCK_STREAM.streamer.name}</span>
            <span className="text-[10px] text-muted-foreground ml-2">{MOCK_STREAM.game}</span>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--yes))]">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--yes))] animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-foreground mb-4 line-clamp-2 leading-relaxed flex-1">
        {MOCK_STREAM.title}
      </p>

      {/* Markets preview */}
      <div className="space-y-1.5 mb-4">
        {MOCK_STREAM.markets.slice(0, 3).map((market) => (
          <div key={market.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
            <span className="text-xs text-foreground/80 truncate mr-2">{market.question}</span>
            <span className="text-[10px] font-mono font-semibold text-primary shrink-0">
              {market.outcomes.length} opts
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            ${MOCK_STREAM.totalVolume.toLocaleString()} vol
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {MOCK_STREAM.viewers?.toLocaleString()} viewers
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {MOCK_STREAM.markets.length} markets
          </span>
        </div>
      </div>
    </div>
  </Link>
);

const MarketCard = ({ market }: { market: any }) => {
  const now = Math.floor(Date.now() / 1000);
  const isOpen = now < market.predictionDeadline && !market.isResolved && !market.isCancelled;
  const totalPool = Number(formatUnits(market.totalPoolAmount, 6));

  return (
    <Link to={`/match/${market.id}`} className="block group">
      <div className="rounded-xl border border-border bg-card p-5 h-full transition-all duration-300 hover:border-glow group-hover:glow-primary flex flex-col">
        {/* Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Market #{market.id}
            </span>
          </div>
          {isOpen ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--yes))]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--yes))] animate-pulse" />
              OPEN
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">CLOSED</span>
          )}
        </div>

        {/* Question */}
        <p className="text-sm font-semibold text-foreground mb-4 line-clamp-2 leading-relaxed flex-1">
          {market.name}
        </p>

        {/* Outcomes */}
        <div className="space-y-1.5 mb-4">
          {market.outcomes.map((outcome: string, i: number) => {
            const poolAmt = Number(formatUnits(market.poolAmounts[i] || 0n, 6));
            const pct = totalPool > 0 ? Math.round((poolAmt / totalPool) * 100) : 0;

            return (
              <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                <span className="text-xs text-foreground/80">{outcome}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ${poolAmt.toFixed(0)}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-primary">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              ${totalPool.toFixed(0)} pool
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {market.outcomes.length} outcomes
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const Index = () => {
  const { markets, isLoading } = useMarkets();
  const { account } = useWallet();

  return (
    <div className="min-h-screen bg-background gradient-radial">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MockStreamCard />
          {!account ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground text-sm">Connect your wallet to view on-chain markets</p>
            </div>
          ) : isLoading ? (
            <div className="col-span-full text-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Loading markets...</p>
            </div>
          ) : (
            markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
