import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import type { Match } from "@/lib/types";
import { Link } from "react-router-dom";

interface MatchCardProps {
  match: Match;
}

const MatchCard = ({ match }: MatchCardProps) => {
  const isLive = match.status === "live";

  return (
    <Link to={`/match/${match.id}`} className="block group">
      <div className="rounded-lg border border-border bg-card p-5 transition-all duration-300 hover:border-glow group-hover:glow-primary">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {match.tournament}
          </span>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="default" className="bg-destructive text-destructive-foreground text-[10px] px-2 py-0 animate-pulse-glow">
                LIVE
              </Badge>
            )}
            {match.status === "upcoming" && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0">
                UPCOMING
              </Badge>
            )}
            {match.viewers && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                {(match.viewers / 1000).toFixed(1)}k
              </span>
            )}
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{match.team1.logo}</span>
            <div>
              <p className="font-semibold text-foreground">{match.team1.name}</p>
              <p className="text-xs text-muted-foreground">{match.game}</p>
            </div>
          </div>

          {match.score ? (
            <div className="flex items-center gap-2 font-mono font-bold text-lg">
              <span className="text-foreground">{match.score.team1}</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-foreground">{match.score.team2}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-mono">VS</span>
          )}

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-foreground">{match.team2.name}</p>
              <p className="text-xs text-muted-foreground">{match.game}</p>
            </div>
            <span className="text-2xl">{match.team2.logo}</span>
          </div>
        </div>

        {/* Markets preview */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {match.markets.length} markets open
          </span>
          <span className="text-xs text-primary font-medium group-hover:text-glow transition-all">
            Trade →
          </span>
        </div>
      </div>
    </Link>
  );
};

export default MatchCard;
