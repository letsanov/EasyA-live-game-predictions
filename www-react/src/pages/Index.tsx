import Header from "@/components/Header";
import { useMarkets, Thread } from "@/hooks/useMarkets";
import { useWallet } from "@/contexts/WalletContext";
import { Swords, TrendingUp, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatUnits } from "ethers";

const ThreadCard = ({ thread }: { thread: Thread }) => {
  const totalPool = Number(formatUnits(thread.totalPool, 6));

  return (
    <Link to={`/thread/${thread.dotaMatchId}`} className="block group">
      <div className="rounded-xl border border-border bg-card p-5 h-full transition-all duration-300 hover:border-glow group-hover:glow-primary flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Dota 2
            </span>
          </div>
          {thread.isOpen ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--yes))]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--yes))] animate-pulse" />
              OPEN
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">CLOSED</span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-foreground mb-4 leading-relaxed flex-1">
          {thread.title}
        </p>

        {/* Markets preview */}
        <div className="space-y-1.5 mb-4">
          {thread.markets.map((market) => {
            const question = market.name.replace(/^(?:.+?\[\d+\](?:\s*\{.+?\})?|Match \d+):\s*/, '');
            const marketPool = Number(formatUnits(market.totalPoolAmount, 6));

            return (
              <div key={market.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                <span className="text-xs text-foreground/80 truncate mr-2">{question}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ${marketPool.toFixed(0)}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-primary shrink-0">
                    {market.outcomes.length} opts
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
              {thread.markets.length} markets
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const Index = () => {
  const { threads, isLoading } = useMarkets();
  const { account } = useWallet();

  return (
    <div className="min-h-screen bg-background gradient-radial">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!account ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground text-sm">Connect your wallet to view predictions</p>
            </div>
          ) : isLoading ? (
            <div className="col-span-full text-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Loading threads...</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <Swords className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No prediction threads yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Create one using the button above</p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadCard key={thread.threadKey} thread={thread} />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
