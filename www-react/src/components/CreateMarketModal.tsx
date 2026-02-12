import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Gamepad2,
  CheckCircle2,
  Swords,
  AlertCircle,
  Tv,
  Lock,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMarketContract } from "@/hooks/useMarketContract";
import { useWallet } from "@/contexts/WalletContext";
import { parseUnits } from "ethers";
import { toast } from "sonner";

interface Player {
  account_id: number;
  personaname: string;
  avatarfull: string;
  inGame: boolean;
  matchId?: number;
  heroId?: number;
  gameTime?: string;
}

interface GameOption {
  id: string;
  name: string;
  icon: string;
  available: boolean;
}

const GAMES: GameOption[] = [
  { id: "dota2", name: "Dota 2", icon: "⚔️", available: true },
  { id: "cs2", name: "Counter-Strike 2", icon: "🔫", available: false },
  { id: "lol", name: "League of Legends", icon: "🏰", available: false },
  { id: "valorant", name: "Valorant", icon: "🎯", available: false },
];

// Auto-generated markets for each match
// Format: "PlayerName [matchId]: Question" — first market also carries {streamUrl} if provided
// Each market has its own duration in seconds
const generateMarketsForMatch = (matchId: number, playerName: string, streamUrl?: string) => {
  const streamTag = streamUrl ? ` {${streamUrl}}` : '';
  return [
    {
      name: `${playerName} [${matchId}]${streamTag}: First blood before 5 minutes?`,
      outcomes: ["Yes", "No"],
      duration: 2 * 60, // 2 minutes — bet fast, first blood happens early
    },
    {
      name: `${playerName} [${matchId}]: Which team gets first tower?`,
      outcomes: ["Radiant", "Dire"],
      duration: 5 * 60, // 5 minutes
    },
    {
      name: `${playerName} [${matchId}]: Which team wins?`,
      outcomes: ["Radiant", "Dire"],
      duration: 15 * 60, // 15 minutes
    },
  ];
};

interface CreateMarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateMarketModal = ({ open, onOpenChange }: CreateMarketModalProps) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [step, setStep] = useState<"game" | "search" | "create">("game");
  const [isCreating, setIsCreating] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");

  const { account } = useWallet();
  const { createMarket } = useMarketContract();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const searchQuery = trpc.players.search.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 }
  );

  const results = searchQuery.data || [];
  const searching = searchQuery.isLoading;

  const handleSelectGame = (game: GameOption) => {
    if (!game.available) return;
    setStep("search");
  };

  const handleSelectPlayer = async (player: any) => {
    // Check if player is in live game
    const liveGame = await fetch(`${import.meta.env.BASE_URL}trpc/players.checkLiveGame?input=${encodeURIComponent(JSON.stringify({ accountId: player.account_id, playerName: player.personaname }))}`).then(r => r.json());

    const playerWithGame: Player = {
      ...player,
      inGame: !!liveGame.result?.data,
      matchId: liveGame.result?.data?.matchId,
      heroId: liveGame.result?.data?.heroId,
    };

    setSelectedPlayer(playerWithGame);
    if (playerWithGame.inGame) {
      setStep("create");
    }
  };

  const handleBack = () => {
    if (step === "create") {
      setStep("search");
      setSelectedPlayer(null);
    } else if (step === "search") {
      setStep("game");
      setSearch("");
      setDebouncedSearch("");
      setSelectedPlayer(null);
    }
  };

  const handleCreate = async () => {
    if (!selectedPlayer?.matchId || !account) return;

    setIsCreating(true);
    try {
      const markets = generateMarketsForMatch(selectedPlayer.matchId, selectedPlayer.personaname, streamUrl.trim() || undefined);
      const seedAmount = parseUnits("1", 6); // 1 USDC (6 decimals)

      // Create all 3 markets with individual durations
      for (const market of markets) {
        await createMarket(
          market.name,
          market.outcomes,
          market.duration,
          account, // Use connected wallet as oracle for now
          seedAmount
        );
      }

      toast.success('Prediction thread created!');
      onOpenChange(false);

      // Reset state
      setSearch("");
      setStreamUrl("");
      setSelectedPlayer(null);
      setStep("game");
    } catch (error) {
      console.error('Failed to create predictions:', error);
      toast.error('Failed to create predictions. Check console for details.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setSearch("");
      setDebouncedSearch("");
      setStreamUrl("");
      setSelectedPlayer(null);
      setStep("game");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Swords className="w-5 h-5 text-primary" />
            New Prediction
          </DialogTitle>
          <DialogDescription>
            {step === "game" && "Choose a game to create predictions on."}
            {step === "search" && "Find a player in a live match."}
            {step === "create" && "Configure and create your prediction thread."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Game Selection */}
        {step === "game" && (
          <div className="space-y-2">
            {GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => handleSelectGame(game)}
                disabled={!game.available}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-3.5 text-left transition-all border ${
                  game.available
                    ? "border-border hover:border-primary/50 hover:bg-secondary/80 cursor-pointer"
                    : "border-border/50 opacity-50 cursor-not-allowed"
                }`}
              >
                <span className="text-xl">{game.icon}</span>
                <div className="flex-1">
                  <span className={`text-sm font-semibold ${game.available ? "text-foreground" : "text-muted-foreground"}`}>
                    {game.name}
                  </span>
                </div>
                {game.available ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Badge variant="secondary" className="text-[10px] bg-muted border-0 gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Soon
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Player Search */}
        {step === "search" && (
          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Dota 2 player..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
              {searching && (
                <div className="absolute right-3 top-0 bottom-0 flex items-center">
                  <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Results */}
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {search.length >= 2 && !searching && results.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No players found for "{search}"
                </div>
              )}
              {results.map((player) => (
                <button
                  key={player.account_id}
                  onClick={() => handleSelectPlayer(player)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary/80 group"
                >
                  {/* Avatar */}
                  <img
                    src={player.avatarfull}
                    alt={player.personaname}
                    className="w-9 h-9 rounded-full bg-secondary shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {player.personaname}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground font-mono">
                      ID: {player.account_id}
                    </div>
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant="secondary"
                    className="bg-muted text-muted-foreground border-0 text-[10px] shrink-0"
                  >
                    <Search className="w-3 h-3 mr-1" />
                    CHECK
                  </Badge>
                </button>
              ))}
            </div>

            {/* Selected offline player warning */}
            {selectedPlayer && !selectedPlayer.inGame && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs text-destructive">
                  <span className="font-semibold">{selectedPlayer.personaname}</span> is
                  not currently in a game. Predictions can only be created on active
                  matches.
                </div>
              </div>
            )}

            {search.length < 2 && (
              <div className="text-center py-6 space-y-2">
                <Gamepad2 className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Type a player name to search
                </p>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs text-muted-foreground">
              Back to game selection
            </Button>
          </div>
        )}

        {/* Step 3: Configure & Create */}
        {step === "create" && selectedPlayer && (
          <div className="space-y-5">
            {/* Player card */}
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedPlayer.avatarfull}
                  alt={selectedPlayer.personaname}
                  className="w-10 h-10 rounded-full bg-secondary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {selectedPlayer.personaname}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--yes))] animate-pulse" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Playing live match
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground font-mono">Match ID</div>
                  <div className="text-xs font-mono text-foreground/70">{selectedPlayer.matchId}</div>
                </div>
              </div>
            </div>

            {/* Stream URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Stream Link (optional)</label>
              <div className="relative">
                <Tv className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="https://twitch.tv/gorgc"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  className="pl-9 bg-secondary border-border text-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Twitch, YouTube, or Kick link — will be embedded in the thread
              </p>
            </div>

            {/* Auto-generated predictions */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                3 Predictions Will Be Created
              </label>
              <div className="space-y-2">
                {selectedPlayer.matchId && generateMarketsForMatch(selectedPlayer.matchId, selectedPlayer.personaname, streamUrl.trim() || undefined).map((market, i) => (
                  <div key={i} className="rounded-lg bg-secondary/50 border border-border p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-xs font-semibold text-foreground">
                        {market.name}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {market.duration >= 60 ? `${market.duration / 60}m` : `${market.duration}s`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {market.outcomes.map((outcome) => (
                        <span
                          key={outcome}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                        >
                          {outcome}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Each prediction will be seeded with 1 USDC on the first outcome
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={isCreating}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Create Thread
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMarketModal;
