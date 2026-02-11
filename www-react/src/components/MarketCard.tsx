import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Market } from "@/lib/types";
import { TrendingUp, BarChart3 } from "lucide-react";

interface MarketCardProps {
  market: Market;
  onTrade: (marketId: string, outcomeId: string, amount: number) => void;
}

const MarketCard = ({ market, onTrade }: MarketCardProps) => {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [amount, setAmount] = useState(10);

  const handleTrade = () => {
    if (selectedOutcome) {
      onTrade(market.id, selectedOutcome, amount);
      setSelectedOutcome(null);
    }
  };

  const selected = market.outcomes.find((o) => o.id === selectedOutcome);
  const potentialPayout = selected ? ((amount / selected.probability) * 100).toFixed(2) : "0";

  // Color palette for outcomes
  const outcomeColors = [
    { bg: "bg-[hsl(var(--yes))]/20", border: "border-[hsl(var(--yes))]", text: "text-[hsl(var(--yes))]", hoverBorder: "hover:border-[hsl(var(--yes))]/50", hoverText: "hover:text-[hsl(var(--yes))]", btnBg: "bg-[hsl(var(--yes))]", btnHover: "hover:bg-[hsl(var(--yes))]/90" },
    { bg: "bg-[hsl(var(--no))]/20", border: "border-[hsl(var(--no))]", text: "text-[hsl(var(--no))]", hoverBorder: "hover:border-[hsl(var(--no))]/50", hoverText: "hover:text-[hsl(var(--no))]", btnBg: "bg-[hsl(var(--no))]", btnHover: "hover:bg-[hsl(var(--no))]/90" },
    { bg: "bg-[hsl(var(--warning))]/20", border: "border-[hsl(var(--warning))]", text: "text-[hsl(var(--warning))]", hoverBorder: "hover:border-[hsl(var(--warning))]/50", hoverText: "hover:text-[hsl(var(--warning))]", btnBg: "bg-[hsl(var(--warning))]", btnHover: "hover:bg-[hsl(var(--warning))]/90" },
    { bg: "bg-primary/20", border: "border-primary", text: "text-primary", hoverBorder: "hover:border-primary/50", hoverText: "hover:text-primary", btnBg: "bg-primary", btnHover: "hover:bg-primary/90" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground leading-tight flex-1 pr-3">
          {market.question}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <BarChart3 className="w-3 h-3" />
          <span className="font-mono">${(market.totalVolume / 1000).toFixed(1)}k</span>
        </div>
      </div>

      {/* Outcome buttons */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {market.outcomes.map((outcome, idx) => {
          const colors = outcomeColors[idx % outcomeColors.length];
          const isSelected = selectedOutcome === outcome.id;
          return (
            <button
              key={outcome.id}
              onClick={() => setSelectedOutcome(isSelected ? null : outcome.id)}
              className={`flex-1 min-w-[60px] rounded-md py-2.5 px-3 text-center transition-all duration-200 border ${
                isSelected
                  ? `${colors.bg} ${colors.border} ${colors.text}`
                  : `border-border ${colors.hoverBorder} text-muted-foreground ${colors.hoverText}`
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider block mb-0.5">{outcome.label}</span>
              <span className="font-mono font-bold text-lg">{outcome.probability}%</span>
            </button>
          );
        })}
      </div>

      {/* Trade panel */}
      {selectedOutcome && selected && (
        <div className="pt-3 border-t border-border space-y-3 animate-slide-up">
          <div className="flex items-center gap-2">
            {[5, 10, 25, 50, 100].map((val) => (
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
            <span className="text-muted-foreground">Potential payout</span>
            <span className="text-success font-mono font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              ${potentialPayout}
            </span>
          </div>

          <Button
            onClick={handleTrade}
            className="w-full font-semibold"
          >
            Buy "{selected.label}" — ${amount}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MarketCard;
