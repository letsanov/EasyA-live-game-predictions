import type { Position } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PositionCardProps {
  position: Position;
}

const PositionCard = ({ position }: PositionCardProps) => {
  const pnl = (position.currentPrice - position.avgPrice) * position.shares / 100;
  const pnlPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice * 100).toFixed(1);
  const isProfit = pnl >= 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground mb-2 leading-tight">{position.question}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/20 text-primary">
            {position.outcomeLabel}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {position.shares} shares @ {position.avgPrice}%
          </span>
        </div>
        <div className={`flex items-center gap-1 text-sm font-mono font-semibold ${
          isProfit ? "text-success" : "text-destructive"
        }`}>
          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          ${Math.abs(pnl).toFixed(2)} ({isProfit ? "+" : ""}{pnlPercent}%)
        </div>
      </div>
    </div>
  );
};

export default PositionCard;
