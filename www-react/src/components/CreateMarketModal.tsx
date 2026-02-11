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
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Loader2,
  Gamepad2,
  Clock,
  CheckCircle2,
  Swords,
  Zap,
  AlertCircle,
} from "lucide-react";

// Mock player database — simulates backend API
const MOCK_PLAYERS = [
  { id: "p1", name: "Gorgc", steamId: "76561198045058569", avatar: "🧔", inGame: true, hero: "Pudge", matchId: "7890123456", gameTime: "24:15", mmr: 7800 },
  { id: "p2", name: "Arteezy", steamId: "76561198047100148", avatar: "👑", inGame: true, hero: "Naga Siren", matchId: "7890123457", gameTime: "31:02", mmr: 9200 },
  { id: "p3", name: "Bulldog", steamId: "76561198053098388", avatar: "🐻", inGame: false, hero: null, matchId: null, gameTime: null, mmr: 6500 },
  { id: "p4", name: "Topson", steamId: "76561198085809832", avatar: "🌀", inGame: true, hero: "Invoker", matchId: "7890123458", gameTime: "08:44", mmr: 9800 },
  { id: "p5", name: "N0tail", steamId: "76561198047004422", avatar: "🌻", inGame: false, hero: null, matchId: null, gameTime: null, mmr: 7200 },
  { id: "p6", name: "Cr1t-", steamId: "76561198071638931", avatar: "⚡", inGame: true, hero: "Earth Spirit", matchId: "7890123459", gameTime: "17:30", mmr: 9500 },
  { id: "p7", name: "SumaiL", steamId: "76561198094352633", avatar: "👶", inGame: false, hero: null, matchId: null, gameTime: null, mmr: 8900 },
  { id: "p8", name: "MidOne", steamId: "76561198073949692", avatar: "🎯", inGame: true, hero: "Storm Spirit", matchId: "7890123460", gameTime: "42:18", mmr: 8600 },
];

type MockPlayer = (typeof MOCK_PLAYERS)[number];

const MARKET_TEMPLATES = [
  "Will {player} win this game?",
  "{player} gets more than 15 kills?",
  "{player} dies fewer than 5 times?",
  "Game ends before 30 minutes?",
  "{player} gets a rampage?",
];

interface CreateMarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateMarketModal = ({ open, onOpenChange }: CreateMarketModalProps) => {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<MockPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<MockPlayer | null>(null);
  const [marketQuestion, setMarketQuestion] = useState("");
  const [step, setStep] = useState<"search" | "create">("search");

  // Simulate API search with debounce
  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      const found = MOCK_PLAYERS.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
      setResults(found);
      setSearching(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectPlayer = (player: MockPlayer) => {
    setSelectedPlayer(player);
    if (player.inGame) {
      setStep("create");
      setMarketQuestion(`Will ${player.name} win this game?`);
    }
  };

  const handleBack = () => {
    setStep("search");
    setSelectedPlayer(null);
    setMarketQuestion("");
  };

  const handleCreate = () => {
    // Would call backend API here
    onOpenChange(false);
    // Reset state
    setSearch("");
    setResults([]);
    setSelectedPlayer(null);
    setMarketQuestion("");
    setStep("search");
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setSearch("");
      setResults([]);
      setSelectedPlayer(null);
      setMarketQuestion("");
      setStep("search");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Swords className="w-5 h-5 text-primary" />
            Create Market
          </DialogTitle>
          <DialogDescription>
            Find a Dota 2 player and create a prediction market on their live game.
          </DialogDescription>
        </DialogHeader>

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
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
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
                  key={player.id}
                  onClick={() => handleSelectPlayer(player)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary/80 group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-lg shrink-0">
                    {player.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {player.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {player.mmr} MMR
                      </span>
                    </div>

                    {player.inGame ? (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--yes))] animate-pulse" />
                        <span className="text-[hsl(var(--yes))] font-medium">
                          In Game
                        </span>
                        <span className="text-muted-foreground">
                          — {player.hero}
                        </span>
                        <span className="text-muted-foreground/60">
                          {player.gameTime}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        Offline
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  {player.inGame ? (
                    <Badge
                      variant="secondary"
                      className="bg-[hsl(var(--yes))]/15 text-[hsl(var(--yes))] border-0 text-[10px] shrink-0"
                    >
                      <Gamepad2 className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground border-0 text-[10px] shrink-0"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      OFFLINE
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Selected offline player warning */}
            {selectedPlayer && !selectedPlayer.inGame && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs text-destructive">
                  <span className="font-semibold">{selectedPlayer.name}</span> is
                  not currently in a game. Markets can only be created on active
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
          </div>
        )}

        {step === "create" && selectedPlayer && (
          <div className="space-y-5">
            {/* Player card */}
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                  {selectedPlayer.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {selectedPlayer.name}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--yes))] animate-pulse" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Playing <span className="text-foreground/80 font-medium">{selectedPlayer.hero}</span> · {selectedPlayer.gameTime} elapsed
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground font-mono">Match ID</div>
                  <div className="text-xs font-mono text-foreground/70">{selectedPlayer.matchId}</div>
                </div>
              </div>
            </div>

            {/* Market question */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Market Question
              </label>
              <Textarea
                value={marketQuestion}
                onChange={(e) => setMarketQuestion(e.target.value)}
                placeholder="e.g., Will Gorgc win this game?"
                className="bg-secondary border-border resize-none h-20"
              />
              <div className="flex flex-wrap gap-1.5">
                {MARKET_TEMPLATES.map((tpl) => {
                  const q = tpl.replace("{player}", selectedPlayer.name);
                  return (
                    <button
                      key={tpl}
                      onClick={() => setMarketQuestion(q)}
                      className="text-[10px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Initial price info */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Market starts at 50/50</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                All outcomes start at equal probability. Prices move as people trade.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={marketQuestion.trim().length < 10}
                className="flex-1 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Create Market
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMarketModal;
