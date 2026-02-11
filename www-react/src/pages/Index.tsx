import { useState } from "react";
import Header from "@/components/Header";
import { MOCK_STREAMS } from "@/lib/types";
import type { Stream } from "@/lib/types";
import { Zap, Eye, ArrowRight, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const platformColors: Record<string, string> = {
  twitch: "bg-[hsl(263,70%,58%)]",
  youtube: "bg-destructive",
  kick: "bg-[hsl(145,70%,45%)]",
};

const StreamCard = ({ stream }: { stream: Stream }) => {
  const isLive = stream.status === "live";
  return (
    <Link to={`/match/${stream.id}`} className="block group">
      <div className="rounded-xl border border-border bg-card p-5 h-full transition-all duration-300 hover:border-glow group-hover:glow-primary flex flex-col">
        {/* Streamer header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl shrink-0">
            {stream.streamer.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">{stream.streamer.name}</span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? "bg-destructive animate-pulse" : "bg-muted-foreground/40"}`} />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 text-white border-0 ${platformColors[stream.streamer.platform]}`}>
                {stream.streamer.platform}
              </Badge>
              <span className="truncate">{stream.game}</span>
            </div>
          </div>
          {isLive && stream.viewers && (
            <span className="flex items-center gap-1 text-[11px] text-destructive font-medium shrink-0">
              <Eye className="w-3 h-3" />
              {stream.viewers > 1000 ? `${(stream.viewers / 1000).toFixed(1)}k` : stream.viewers}
            </span>
          )}
        </div>

        {/* Stream title */}
        <p className="text-sm text-foreground/80 mb-4 line-clamp-2 leading-relaxed">{stream.title}</p>

        {/* Hot markets preview */}
        <div className="space-y-2 mb-4 flex-1">
          {stream.markets.slice(0, 2).map((market) => {
            const top = market.outcomes[0];
            return (
              <div key={market.id} className="rounded-lg bg-secondary/50 px-3 py-2">
                <p className="text-xs text-foreground/70 mb-1.5 line-clamp-1">{market.question}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {market.outcomes.map((o) => (
                    <span key={o.id} className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-secondary text-foreground/70">
                      {o.label} <span className="text-primary">{o.probability}%</span>
                    </span>
                  ))}
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
              ${(stream.totalVolume / 1000).toFixed(1)}k vol
            </span>
            <span>{stream.markets.length} markets</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-primary font-semibold group-hover:text-glow transition-all">
            Trade <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
};

const HotMarketPill = ({ question, probability, label, streamName }: { question: string; probability: number; label: string; streamName: string }) => (
  <div className="inline-flex items-center gap-2 rounded-full bg-secondary/60 border border-border px-3 py-1.5 text-xs whitespace-nowrap">
    <span className="text-muted-foreground">{streamName}:</span>
    <span className="text-foreground/80 max-w-[180px] truncate">{question}</span>
    <span className="font-mono font-semibold text-primary">{label} {probability}%</span>
  </div>
);

const Index = () => {
  const [filter, setFilter] = useState<"all" | "live" | "upcoming">("all");

  const filtered = MOCK_STREAMS.filter((s) =>
    filter === "all" ? true : s.status === filter
  );

  // Collect hottest markets across all streams
  const hotMarkets = MOCK_STREAMS
    .flatMap((s) => s.markets.map((m) => ({ ...m, streamName: s.streamer.name })))
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background gradient-radial">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Trending ticker */}
        <div className="mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Trending</span>
          </div>
          <div className="flex gap-2">
            {hotMarkets.map((m) => (
              <HotMarketPill key={m.id} question={m.question} probability={m.outcomes[0].probability} label={m.outcomes[0].label} streamName={m.streamName} />
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {(["all", "live", "upcoming"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {f === "all" ? "All Streams" : f === "live" ? "🔴 Live" : "Starting Soon"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {MOCK_STREAMS.filter((s) => s.status === "live").length} live now
          </div>
        </div>

        {/* Stream grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No streams found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
