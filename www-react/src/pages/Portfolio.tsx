import Header from "@/components/Header";
import PositionCard from "@/components/PositionCard";
import { MOCK_POSITIONS } from "@/lib/types";
import { Briefcase } from "lucide-react";

const Portfolio = () => {
  const totalValue = MOCK_POSITIONS.reduce(
    (sum, p) => sum + (p.currentPrice * p.shares) / 100,
    0
  );

  return (
    <div className="min-h-screen bg-background gradient-radial">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary" />
            Portfolio
          </h1>
          <p className="text-muted-foreground">
            Your active positions and P&L
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Positions</p>
            <p className="text-2xl font-bold font-mono text-foreground">{MOCK_POSITIONS.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Portfolio Value</p>
            <p className="text-2xl font-bold font-mono text-foreground">${totalValue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <p className="text-2xl font-bold font-mono text-primary">$247.50</p>
          </div>
        </div>

        {/* Positions */}
        <div className="space-y-3">
          {MOCK_POSITIONS.map((pos) => (
            <PositionCard key={pos.marketId} position={pos} />
          ))}
          {MOCK_POSITIONS.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              No positions yet. Start trading!
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Portfolio;
