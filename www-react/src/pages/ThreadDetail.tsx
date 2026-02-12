import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import { useMarkets, MarketData, HistoryPoint } from "@/hooks/useMarkets";
import { useMarketContract } from "@/hooks/useMarketContract";
import { ArrowLeft, Swords, TrendingUp, Loader2, BarChart3, MonitorPlay, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUnits, parseUnits } from "ethers";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Twitch: twitch.tv/channelname
    if (u.hostname.includes('twitch.tv')) {
      const channel = u.pathname.split('/').filter(Boolean)[0];
      if (channel) return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
    }
    // YouTube: youtube.com/watch?v=ID or youtu.be/ID or youtube.com/live/ID
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = u.searchParams.get('v');
      if (!videoId && u.hostname.includes('youtu.be')) videoId = u.pathname.slice(1);
      if (!videoId) {
        const livePath = u.pathname.match(/\/live\/(.+)/);
        if (livePath) videoId = livePath[1];
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    // Kick: kick.com/channelname
    if (u.hostname.includes('kick.com')) {
      const channel = u.pathname.split('/').filter(Boolean)[0];
      if (channel) return `https://player.kick.com/${channel}`;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

const CHART_COLORS = [
  "hsl(145, 70%, 45%)",  // green (yes)
  "hsl(0, 72%, 51%)",    // red (no)
  "hsl(38, 92%, 50%)",   // orange
  "hsl(180, 90%, 50%)",  // cyan
  "hsl(280, 70%, 55%)",  // purple
];

const ProbabilityChart = ({ market, history }: { market: MarketData; history: HistoryPoint[] }) => {
  const question = market.name.replace(/^(?:.+?\[\d+\](?:\s*\{.+?\})?|Match \d+):\s*/, '');
  const totalPool = Number(formatUnits(market.totalPoolAmount, 6));

  // Build chart data from history
  const data = history.map((point) => ({
    time: point.time,
    ...point.percentages,
  }));

  // Current percentages for legend
  const currentPcts = market.outcomes.map((_, i) => {
    const poolAmt = Number(formatUnits(market.poolAmounts[i] || 0n, 6));
    return totalPool > 0 ? Math.round((poolAmt / totalPool) * 100) : 0;
  });

  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Probability Over Time — {question}
        </h4>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <MonitorPlay className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Collecting data...</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Chart will appear as odds change over time</p>
          </div>
        </div>
        {/* Legend with current values */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {market.outcomes.map((outcome: string, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
              <span className="text-muted-foreground">{outcome}</span>
              <span className="font-mono font-semibold text-foreground">{currentPcts[idx]}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Probability Over Time — {question}
      </h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} stroke="hsl(220, 15%, 18%)" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} stroke="hsl(220, 15%, 18%)" tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 10%)",
                border: "1px solid hsl(220, 15%, 18%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                const idx = parseInt(name);
                return [`${value}%`, market.outcomes[idx] || name];
              }}
            />
            {market.outcomes.map((_: string, idx: number) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={String(idx)}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={String(idx)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {market.outcomes.map((outcome: string, idx: number) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
            <span className="text-muted-foreground">{outcome}</span>
            <span className="font-mono font-semibold text-foreground">{currentPcts[idx]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatTimeLeft(deadline: number, now: number): string {
  const diff = deadline - now;
  if (diff <= 0) return "Closed";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const OUTCOME_COLORS = [
  { bg: "bg-[hsl(var(--yes))]/20", border: "border-[hsl(var(--yes))]", text: "text-[hsl(var(--yes))]", hoverBorder: "hover:border-[hsl(var(--yes))]/50", hoverText: "hover:text-[hsl(var(--yes))]" },
  { bg: "bg-[hsl(var(--no))]/20", border: "border-[hsl(var(--no))]", text: "text-[hsl(var(--no))]", hoverBorder: "hover:border-[hsl(var(--no))]/50", hoverText: "hover:text-[hsl(var(--no))]" },
  { bg: "bg-[hsl(var(--warning))]/20", border: "border-[hsl(var(--warning))]", text: "text-[hsl(var(--warning))]", hoverBorder: "hover:border-[hsl(var(--warning))]/50", hoverText: "hover:text-[hsl(var(--warning))]" },
  { bg: "bg-primary/20", border: "border-primary", text: "text-primary", hoverBorder: "hover:border-primary/50", hoverText: "hover:text-primary" },
  { bg: "bg-cyan-500/20", border: "border-cyan-500", text: "text-cyan-500", hoverBorder: "hover:border-cyan-500/50", hoverText: "hover:text-cyan-500" },
];

const TradingCard = ({ market }: { market: MarketData }) => {
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [amount, setAmount] = useState(1);
  const [isBetting, setIsBetting] = useState(false);
  const { makePrediction } = useMarketContract();

  const now = Math.floor(Date.now() / 1000);
  const isOpen = now < market.predictionDeadline && !market.isResolved && !market.isCancelled;
  const totalPool = Number(formatUnits(market.totalPoolAmount, 6));

  const question = market.name.replace(/^(?:.+?\[\d+\](?:\s*\{.+?\})?|Match \d+):\s*/, '');

  // Pari-mutuel payout: (yourBet / (outcomePool + yourBet)) * (totalPool + yourBet)
  const outcomePool = selectedOutcome !== null
    ? Number(formatUnits(market.poolAmounts[selectedOutcome] || 0n, 6))
    : 0;
  const newOutcomePool = outcomePool + amount;
  const newTotalPool = totalPool + amount;
  const potentialPayout = selectedOutcome !== null && newOutcomePool > 0
    ? ((amount / newOutcomePool) * newTotalPool).toFixed(2)
    : "0";
  const multiplier = selectedOutcome !== null && newOutcomePool > 0
    ? (newTotalPool / newOutcomePool).toFixed(1)
    : "0";

  const handleTrade = async () => {
    if (selectedOutcome === null) return;
    setIsBetting(true);
    try {
      await makePrediction(market.id, selectedOutcome, parseUnits(String(amount), 6));
      toast.success(`Bet $${amount} on "${market.outcomes[selectedOutcome]}"`, {
        description: "Position added to your portfolio",
      });
      setSelectedOutcome(null);
    } catch (error) {
      console.error('Bet failed:', error);
      toast.error('Bet failed. Check console for details.');
    } finally {
      setIsBetting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground leading-tight flex-1 pr-3">
          {question}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <BarChart3 className="w-3 h-3" />
          <span className="font-mono">${totalPool.toFixed(0)}</span>
        </div>
      </div>

      {/* Outcome buttons */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {market.outcomes.map((outcome: string, idx: number) => {
          const colors = OUTCOME_COLORS[idx % OUTCOME_COLORS.length];
          const poolAmt = Number(formatUnits(market.poolAmounts[idx] || 0n, 6));
          const pct = totalPool > 0 ? Math.round((poolAmt / totalPool) * 100) : 0;
          const isSelected = selectedOutcome === idx;
          return (
            <button
              key={idx}
              onClick={() => isOpen && setSelectedOutcome(isSelected ? null : idx)}
              disabled={!isOpen}
              className={`flex-1 min-w-[60px] rounded-md py-2.5 px-3 text-center transition-all duration-200 border ${
                isSelected
                  ? `${colors.bg} ${colors.border} ${colors.text}`
                  : `border-border ${colors.hoverBorder} text-muted-foreground ${colors.hoverText}`
              } ${isOpen ? "cursor-pointer" : "cursor-default opacity-60"}`}
            >
              <span className="text-[10px] uppercase tracking-wider block mb-0.5">{outcome}</span>
              <span className="font-mono font-bold text-lg">{pct}%</span>
            </button>
          );
        })}
      </div>

      {/* Trade panel */}
      {isOpen && selectedOutcome !== null && (
        <div className="pt-3 border-t border-border space-y-3 animate-slide-up">
          <div className="flex items-center gap-2">
            {[1, 5, 10, 25, 100].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val)}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                  amount === val
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                ${val}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Potential payout ({multiplier}x)</span>
            <span className="text-success font-mono font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              ${potentialPayout}
            </span>
          </div>

          <Button
            onClick={handleTrade}
            disabled={isBetting}
            className="w-full font-semibold"
          >
            {isBetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Buy "{market.outcomes[selectedOutcome]}" — ${amount}</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

const MarketTabs = ({ markets, activeMarketIdx, onSelect }: { markets: MarketData[]; activeMarketIdx: number; onSelect: (idx: number) => void }) => {
  const now = useNow();

  return (
    <div className="space-y-1.5 mb-4">
      {markets.map((market, idx) => {
        const question = market.name.replace(/^(?:.+?\[\d+\](?:\s*\{.+?\})?|Match \d+):\s*/, '');
        const marketPool = Number(formatUnits(market.totalPoolAmount, 6));
        const timeLeft = formatTimeLeft(market.predictionDeadline, now);
        const isClosed = market.isResolved || market.isCancelled || now >= market.predictionDeadline;
        const isUrgent = !isClosed && (market.predictionDeadline - now) < 300; // < 5 min

        return (
          <button
            key={market.id}
            onClick={() => onSelect(idx)}
            className={`w-full text-left rounded-lg px-3 py-3 transition-all border ${
              idx === activeMarketIdx
                ? "border-primary/50 bg-primary/5 glow-primary"
                : "border-border bg-card hover:border-border hover:bg-secondary/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`text-sm font-medium leading-tight ${idx === activeMarketIdx ? "text-foreground" : "text-foreground/70"}`}>
                {question}
              </p>
              <span className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${
                isClosed
                  ? "text-muted-foreground"
                  : isUrgent
                  ? "text-destructive animate-pulse"
                  : "text-muted-foreground"
              }`}>
                <Clock className="w-3 h-3" />
                {isClosed ? (market.isResolved ? "Resolved" : market.isCancelled ? "Cancelled" : "Closed") : timeLeft}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {market.outcomes.map((outcome: string, oi: number) => {
                const poolAmt = Number(formatUnits(market.poolAmounts[oi] || 0n, 6));
                const pct = marketPool > 0 ? Math.round((poolAmt / marketPool) * 100) : 0;
                return (
                  <span key={oi} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {outcome} <span className="font-semibold text-foreground/80">{pct}%</span>
                  </span>
                );
              })}
              <span className="text-[10px] text-muted-foreground ml-auto font-mono">${marketPool.toFixed(0)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const ThreadDetail = () => {
  const { matchId } = useParams();
  const { threads, history, isLoading } = useMarkets();
  const [activeMarketIdx, setActiveMarketIdx] = useState(0);

  const thread = threads.find((t) => t.dotaMatchId === matchId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading thread...</p>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Swords className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Thread not found</p>
          <Link to="/" className="text-primary text-sm mt-2 inline-block hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const totalPool = Number(formatUnits(thread.totalPool, 6));
  const activeMarket = thread.markets[activeMarketIdx];
  const embedUrl = thread.streamUrl ? getEmbedUrl(thread.streamUrl) : null;

  return (
    <div className="min-h-screen bg-background gradient-radial">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to threads
        </Link>

        {/* Thread Info Bar */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <Swords className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-foreground">{thread.title}</h1>
                {thread.isOpen && (
                  <Badge variant="default" className="bg-destructive text-destructive-foreground text-[10px] animate-pulse">
                    LIVE
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Dota 2 Match Thread</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>Dota 2</span>
                {thread.dotaMatchId && (
                  <a
                    href={`https://www.opendota.com/matches/${thread.dotaMatchId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono hover:text-primary transition-colors"
                  >
                    Match #{thread.dotaMatchId}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {thread.markets.length} markets
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  ${totalPool.toFixed(0)} pool
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left — Stream + Chart + active market stats */}
          <div className="lg:col-span-3 space-y-4">
            {/* Stream embed */}
            {embedUrl ? (
              <div className="rounded-lg border border-border bg-card aspect-video overflow-hidden relative">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
                {thread.isOpen && (
                  <Badge variant="default" className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] animate-pulse">
                    LIVE
                  </Badge>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card aspect-video flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="text-center z-10">
                  <MonitorPlay className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No stream linked</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Stream can be added when creating the market</p>
                </div>
              </div>
            )}

            {/* Probability Chart */}
            {activeMarket && (
              <ProbabilityChart
                market={activeMarket}
                history={history[activeMarket.id] || []}
              />
            )}

            {/* Active Market Stats */}
            {activeMarket && (() => {
              const marketPool = Number(formatUnits(activeMarket.totalPoolAmount, 6));
              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pool Size</div>
                    <div className="font-mono font-bold text-foreground">${marketPool.toFixed(0)}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Outcomes</div>
                    <div className="font-mono font-bold text-foreground">{activeMarket.outcomes.length}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Market ID</div>
                    <div className="font-mono font-bold text-foreground">#{activeMarket.id}</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right — Market Tabs + Trading */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-bold text-foreground mb-1">Markets</h2>
            <p className="text-xs text-muted-foreground mb-3">Select a market to view stats and trade.</p>

            {/* Market Tabs */}
            <MarketTabs
              markets={thread.markets}
              activeMarketIdx={activeMarketIdx}
              onSelect={setActiveMarketIdx}
            />

            {/* Active Market Trading Card */}
            {activeMarket && <TradingCard key={activeMarket.id} market={activeMarket} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ThreadDetail;
