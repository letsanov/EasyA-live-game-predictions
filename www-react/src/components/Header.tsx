import { useState, useEffect } from "react";
import { Wallet, Flame, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CreateMarketModal from "@/components/CreateMarketModal";
import { useWallet } from "@/contexts/WalletContext";
import { useMarketContract } from "@/hooks/useMarketContract";
import { formatUnits } from "ethers";

const Header = () => {
  const location = useLocation();
  const { account, connect, isConnecting } = useWallet();
  const { getUSDCBalance } = useMarketContract();
  const [createOpen, setCreateOpen] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  useEffect(() => {
    if (!account) {
      setUsdcBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const balance = await getUSDCBalance();
        setUsdcBalance(formatUnits(balance, 6));
      } catch {
        // Likely wrong network - silently ignore
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [account]);

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
              Threads
            </Link>
            <Link
              to="/portfolio"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/portfolio" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My Predictions
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1.5 text-xs"
              disabled={!account}
            >
              <Plus className="w-3.5 h-3.5" />
              New Prediction
            </Button>
            {account ? (
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
                <Wallet className="w-4 h-4 text-primary" />
                {usdcBalance !== null && (
                  <span className="font-mono font-semibold text-sm text-primary">
                    ${Number(usdcBalance).toLocaleString()}
                  </span>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {truncateAddress(account)}
                </span>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={connect}
                disabled={isConnecting}
                variant="secondary"
                className="gap-1.5 text-xs"
              >
                <Wallet className="w-3.5 h-3.5" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>
      </header>
      <CreateMarketModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
};

export default Header;
