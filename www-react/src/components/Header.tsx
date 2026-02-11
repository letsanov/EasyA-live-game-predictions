import { useState } from "react";
import { Wallet, Flame, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CreateMarketModal from "@/components/CreateMarketModal";

const Header = () => {
  const location = useLocation();
  const balance = 247.50;
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg text-foreground tracking-tight">
              RIFT<span className="text-primary">.gg</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Streams
            </Link>
            <Link
              to="/portfolio"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/portfolio" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Portfolio
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Market
            </Button>
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="font-mono font-semibold text-sm text-foreground">${balance.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </header>
      <CreateMarketModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
};

export default Header;
