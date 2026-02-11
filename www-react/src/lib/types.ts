export interface Streamer {
  name: string;
  avatar: string;
  platform: "twitch" | "youtube" | "kick";
  handle: string;
  isLive: boolean;
  viewers?: number;
}

export interface MarketOutcome {
  id: string;
  label: string;
  probability: number; // 0-100 percent
  volume: number;
}

export interface ProbabilityPoint {
  time: string; // e.g. "0:00", "5:00"
  values: Record<string, number>; // outcomeId → probability
}

export interface Market {
  id: string;
  streamId: string;
  question: string;
  outcomes: MarketOutcome[];
  totalVolume: number;
  status: "open" | "closed" | "resolved";
  resolvedOutcomeId?: string;
  category: "gameplay" | "challenge" | "milestone" | "chat" | "other";
  createdBy: string;
  history: ProbabilityPoint[];
}

export interface Stream {
  id: string;
  streamer: Streamer;
  game: string;
  title: string;
  status: "live" | "upcoming" | "ended";
  viewers?: number;
  streamUrl?: string;
  startTime: string;
  markets: Market[];
  totalVolume: number;
}

export interface Position {
  marketId: string;
  outcomeId: string;
  streamId: string;
  question: string;
  outcomeLabel: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
}

// Keep Match type for backward compat with MatchDetail page
export interface Team {
  name: string;
  logo: string;
  shortName: string;
}

export interface Match {
  id: string;
  team1: Team;
  team2: Team;
  game: string;
  tournament: string;
  status: "live" | "upcoming" | "finished";
  score?: { team1: number; team2: number };
  viewers?: number;
  streamUrl?: string;
  startTime: string;
  markets: Market[];
}

// Helper to generate fake history
function genHistory(outcomeIds: string[], baseProbs: number[], points: number): ProbabilityPoint[] {
  const history: ProbabilityPoint[] = [];
  const current = [...baseProbs];
  for (let i = 0; i <= points; i++) {
    const time = `${Math.floor((i * 2))}:00`;
    const values: Record<string, number> = {};
    let total = 0;
    outcomeIds.forEach((id, idx) => {
      // random walk
      current[idx] = Math.max(2, Math.min(90, current[idx] + (Math.random() - 0.5) * 8));
      total += current[idx];
    });
    // normalize to 100
    outcomeIds.forEach((id, idx) => {
      values[id] = Math.round((current[idx] / total) * 100);
    });
    history.push({ time, values });
  }
  return history;
}

export const MOCK_STREAMS: Stream[] = [
  {
    id: "stream-1",
    streamer: {
      name: "Gorgc",
      avatar: "🧔",
      platform: "twitch",
      handle: "gaborGorgc",
      isLive: true,
      viewers: 8200,
    },
    game: "Dota 2",
    title: "Road to Immortal — ranked grind day 47",
    status: "live",
    viewers: 8200,
    startTime: new Date().toISOString(),
    totalVolume: 14200,
    markets: [
      {
        id: "m1", streamId: "stream-1", question: "Will Gorgc win this game?",
        outcomes: [
          { id: "m1-yes", label: "Yes", probability: 58, volume: 2400 },
          { id: "m1-no", label: "No", probability: 42, volume: 1800 },
        ],
        totalVolume: 4200, status: "open", category: "gameplay", createdBy: "chat_user_42",
        history: genHistory(["m1-yes", "m1-no"], [50, 50], 12),
      },
      {
        id: "m2", streamId: "stream-1", question: "Gorgc rage quits before stream ends?",
        outcomes: [
          { id: "m2-yes", label: "Yes", probability: 22, volume: 1500 },
          { id: "m2-no", label: "No", probability: 78, volume: 5300 },
        ],
        totalVolume: 6800, status: "open", category: "challenge", createdBy: "degen_andy",
        history: genHistory(["m2-yes", "m2-no"], [30, 70], 12),
      },
      {
        id: "m3", streamId: "stream-1", question: "Who gets first blood?",
        outcomes: [
          { id: "m3-radiant", label: "Radiant", probability: 45, volume: 900 },
          { id: "m3-dire", label: "Dire", probability: 38, volume: 700 },
          { id: "m3-none", label: "No FB by 5min", probability: 17, volume: 200 },
        ],
        totalVolume: 1800, status: "open", category: "gameplay", createdBy: "stats_nerd",
        history: genHistory(["m3-radiant", "m3-dire", "m3-none"], [40, 40, 20], 12),
      },
      {
        id: "m4", streamId: "stream-1", question: "What hero does Gorgc pick next game?",
        outcomes: [
          { id: "m4-pudge", label: "Pudge", probability: 25, volume: 400 },
          { id: "m4-lc", label: "Legion Commander", probability: 20, volume: 350 },
          { id: "m4-wr", label: "Windranger", probability: 18, volume: 300 },
          { id: "m4-other", label: "Other", probability: 37, volume: 350 },
        ],
        totalVolume: 1400, status: "open", category: "gameplay", createdBy: "pudge_lover",
        history: genHistory(["m4-pudge", "m4-lc", "m4-wr", "m4-other"], [25, 20, 18, 37], 12),
      },
    ],
  },
  {
    id: "stream-2",
    streamer: {
      name: "Pirate Software",
      avatar: "🏴‍☠️",
      platform: "twitch",
      handle: "piratesoftware",
      isLive: true,
      viewers: 12400,
    },
    game: "Heartbound",
    title: "Working on HEARTBOUND live — indie dev hours",
    status: "live",
    viewers: 12400,
    startTime: new Date().toISOString(),
    totalVolume: 8900,
    markets: [
      {
        id: "m5", streamId: "stream-2", question: "Will he show a new game mechanic today?",
        outcomes: [
          { id: "m5-yes", label: "Yes", probability: 65, volume: 2100 },
          { id: "m5-no", label: "No", probability: 35, volume: 1100 },
        ],
        totalVolume: 3200, status: "open", category: "milestone", createdBy: "heartbound_fan",
        history: genHistory(["m5-yes", "m5-no"], [55, 45], 12),
      },
      {
        id: "m6", streamId: "stream-2", question: "Stream goes over 6 hours?",
        outcomes: [
          { id: "m6-yes", label: "Yes", probability: 72, volume: 4100 },
          { id: "m6-no", label: "No", probability: 28, volume: 1600 },
        ],
        totalVolume: 5700, status: "open", category: "challenge", createdBy: "marathon_watcher",
        history: genHistory(["m6-yes", "m6-no"], [60, 40], 12),
      },
    ],
  },
  {
    id: "stream-3",
    streamer: {
      name: "SmallAnt",
      avatar: "🐜",
      platform: "youtube",
      handle: "SmallAnt",
      isLive: true,
      viewers: 18700,
    },
    game: "Minecraft",
    title: "Beating Minecraft but every mob has 1000 HP",
    status: "live",
    viewers: 18700,
    startTime: new Date().toISOString(),
    totalVolume: 31400,
    markets: [
      {
        id: "m7", streamId: "stream-3", question: "Beats the Ender Dragon this stream?",
        outcomes: [
          { id: "m7-yes", label: "Yes", probability: 41, volume: 5200 },
          { id: "m7-no", label: "No", probability: 59, volume: 7600 },
        ],
        totalVolume: 12800, status: "open", category: "challenge", createdBy: "ant_colony",
        history: genHistory(["m7-yes", "m7-no"], [50, 50], 12),
      },
      {
        id: "m8", streamId: "stream-3", question: "How many deaths this stream?",
        outcomes: [
          { id: "m8-under", label: "Under 30", probability: 15, volume: 1200 },
          { id: "m8-30-50", label: "30–50", probability: 32, volume: 2600 },
          { id: "m8-50-80", label: "50–80", probability: 35, volume: 2900 },
          { id: "m8-over", label: "Over 80", probability: 18, volume: 1500 },
        ],
        totalVolume: 8200, status: "open", category: "gameplay", createdBy: "death_counter",
        history: genHistory(["m8-under", "m8-30-50", "m8-50-80", "m8-over"], [20, 30, 30, 20], 12),
      },
      {
        id: "m9", streamId: "stream-3", question: "Chat donates over $2k?",
        outcomes: [
          { id: "m9-yes", label: "Yes", probability: 55, volume: 5700 },
          { id: "m9-no", label: "No", probability: 45, volume: 4700 },
        ],
        totalVolume: 10400, status: "open", category: "chat", createdBy: "money_man",
        history: genHistory(["m9-yes", "m9-no"], [45, 55], 12),
      },
    ],
  },
  {
    id: "stream-4",
    streamer: {
      name: "Wirtual",
      avatar: "🏎️",
      platform: "twitch",
      handle: "Wirtual",
      isLive: false,
    },
    game: "Trackmania",
    title: "WR Hunting — Campaign Maps",
    status: "upcoming",
    startTime: new Date(Date.now() + 7200000).toISOString(),
    totalVolume: 4100,
    markets: [
      {
        id: "m10", streamId: "stream-4", question: "Gets a new World Record today?",
        outcomes: [
          { id: "m10-yes", label: "Yes", probability: 30, volume: 1900 },
          { id: "m10-no", label: "No", probability: 70, volume: 900 },
        ],
        totalVolume: 2800, status: "open", category: "milestone", createdBy: "tm_enjoyer",
        history: genHistory(["m10-yes", "m10-no"], [35, 65], 6),
      },
      {
        id: "m11", streamId: "stream-4", question: "Breaks keyboard on stream?",
        outcomes: [
          { id: "m11-yes", label: "Yes", probability: 8, volume: 100 },
          { id: "m11-no", label: "No", probability: 92, volume: 1200 },
        ],
        totalVolume: 1300, status: "open", category: "challenge", createdBy: "keyboard_rip",
        history: genHistory(["m11-yes", "m11-no"], [10, 90], 6),
      },
    ],
  },
  {
    id: "stream-5",
    streamer: {
      name: "iiTzTimmy",
      avatar: "⚡",
      platform: "kick",
      handle: "iiTzTimmy",
      isLive: false,
    },
    game: "Apex Legends",
    title: "Bronze to Pred in one stream — attempt #3",
    status: "upcoming",
    startTime: new Date(Date.now() + 3600000).toISOString(),
    totalVolume: 22600,
    markets: [
      {
        id: "m12", streamId: "stream-5", question: "Reaches Predator this stream?",
        outcomes: [
          { id: "m12-yes", label: "Yes", probability: 25, volume: 3800 },
          { id: "m12-no", label: "No", probability: 75, volume: 11400 },
        ],
        totalVolume: 15200, status: "open", category: "challenge", createdBy: "apex_degen",
        history: genHistory(["m12-yes", "m12-no"], [30, 70], 6),
      },
      {
        id: "m13", streamId: "stream-5", question: "Gets a 20 bomb in ranked?",
        outcomes: [
          { id: "m13-yes", label: "Yes", probability: 45, volume: 3300 },
          { id: "m13-no", label: "No", probability: 55, volume: 4100 },
        ],
        totalVolume: 7400, status: "open", category: "gameplay", createdBy: "clip_chimp",
        history: genHistory(["m13-yes", "m13-no"], [40, 60], 6),
      },
    ],
  },
];

// Backward compat
export const MOCK_MATCHES: Match[] = MOCK_STREAMS.map((s) => ({
  id: s.id,
  team1: { name: s.streamer.name, logo: s.streamer.avatar, shortName: s.streamer.handle.slice(0, 3).toUpperCase() },
  team2: { name: "Challenge", logo: "🎯", shortName: "TGT" },
  game: s.game,
  tournament: s.title,
  status: s.status === "ended" ? "finished" : s.status,
  viewers: s.viewers,
  streamUrl: s.streamUrl,
  startTime: s.startTime,
  markets: s.markets,
}));

export const MOCK_POSITIONS: Position[] = [
  { marketId: "m1", outcomeId: "m1-yes", streamId: "stream-1", question: "Will Gorgc win this game?", outcomeLabel: "Yes", shares: 50, avgPrice: 52, currentPrice: 58 },
  { marketId: "m7", outcomeId: "m7-no", streamId: "stream-3", question: "Beats the Ender Dragon this stream?", outcomeLabel: "No", shares: 30, avgPrice: 55, currentPrice: 59 },
];
