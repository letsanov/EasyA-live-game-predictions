import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import MarketCard from "@/components/MarketCard";
import { MOCK_STREAMS } from "@/lib/types";
import type { Market } from "@/lib/types";
import { ArrowLeft, Eye, MonitorPlay, BarChart3, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const CHART_COLORS = [
  "hsl(145, 70%, 45%)",  // green (yes)
  "hsl(0, 72%, 51%)",    // red (no)
  "hsl(38, 92%, 50%)",   // orange
  "hsl(180, 90%, 50%)",  // cyan
];

const MarketHistoryChart = ({ market }: { market: Market }) => {
  const data = market.history.map((point) => ({
    time: point.time,
    ...point.values,
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Probability Over Time</h4>
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
                const outcome = market.outcomes.find((o) => o.id === name);
                return [`${value}%`, outcome?.label || name];
              }}
            />
            {market.outcomes.map((outcome, idx) => (
              <Line
                key={outcome.id}
                type="monotone"
                dataKey={outcome.id}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={outcome.id}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {market.outcomes.map((outcome, idx) => (
          <div key={outcome.id} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
            <span className="text-muted-foreground">{outcome.label}</span>
            <span className="font-mono font-semibold text-foreground">{outcome.probability}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MatchDetail = () => {
  const { id } = useParams();
  const stream = MOCK_STREAMS.find((s) => s.id === id);
  const [activeMarketIdx, setActiveMarketIdx] = useState(0);

  if (!stream) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Stream not found
        </div>
      </div>
    );
  }

  const handleTrade = (marketId: string, outcomeId: string, amount: number) => {
    const market = stream.markets.find((m) => m.id === marketId);
    const outcome = market?.outcomes.find((o) => o.id === outcomeId);
    toast.success(`Bought "${outcome?.label}" shares for $${amount}`, {
      description: "Position added to your portfolio",
    });
  };

  const isLive = stream.status === "live";
  const activeMarket = stream.markets[activeMarketIdx];

  return (
    <div className="min-h-screen bg-background gradient-radial">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to streams
        </Link>

        {/* Streamer Info Bar */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-3xl shrink-0">
              {stream.streamer.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-foreground">{stream.streamer.name}</h1>
                {isLive && (
                  <Badge variant="default" className="bg-destructive text-destructive-foreground text-[10px] animate-pulse">
                    LIVE
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{stream.title}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>{stream.game}</span>
                {stream.viewers && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {(stream.viewers / 1000).toFixed(1)}k watching
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {stream.markets.length} markets
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left — Stream + Active Market Chart */}
          <div className="lg:col-span-3 space-y-4">
            {/* Stream placeholder */}
            <div className="rounded-lg border border-border bg-card aspect-video flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <div className="text-center z-10">
                <MonitorPlay className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Stream viewer</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Embed your Twitch/YouTube stream here</p>
              </div>
              {isLive && (
                <Badge variant="default" className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>

            {/* Active Market Chart */}
            {activeMarket && <MarketHistoryChart market={activeMarket} />}

            {/* Market Stats */}
            {activeMarket && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Volume</div>
                  <div className="font-mono font-bold text-foreground">${(activeMarket.totalVolume / 1000).toFixed(1)}k</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Outcomes</div>
                  <div className="font-mono font-bold text-foreground">{activeMarket.outcomes.length}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Created By</div>
                  <div className="font-mono font-bold text-foreground text-xs truncate">{activeMarket.createdBy}</div>
                </div>
              </div>
            )}
          </div>

          {/* Right — Market Tabs + Trading */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-bold text-foreground mb-1">Markets</h2>
            <p className="text-xs text-muted-foreground mb-3">Select a market to view stats and trade.</p>

            {/* Market Tabs */}
            <div className="space-y-1.5 mb-4">
              {stream.markets.map((market, idx) => (
                <button
                  key={market.id}
                  onClick={() => setActiveMarketIdx(idx)}
                  className={`w-full text-left rounded-lg px-3 py-3 transition-all border ${
                    idx === activeMarketIdx
                      ? "border-primary/50 bg-primary/5 glow-primary"
                      : "border-border bg-card hover:border-border hover:bg-secondary/50"
                  }`}
                >
                  <p className={`text-sm font-medium leading-tight mb-1 ${idx === activeMarketIdx ? "text-foreground" : "text-foreground/70"}`}>
                    {market.question}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {market.outcomes.map((o) => (
                      <span key={o.id} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {o.label} <span className="font-semibold text-foreground/80">{o.probability}%</span>
                      </span>
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-auto font-mono">${(market.totalVolume / 1000).toFixed(1)}k</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Active Market Trading Card */}
            {activeMarket && (
              <MarketCard market={activeMarket} onTrade={handleTrade} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MatchDetail;
