/**
 * OpenDota API Service
 * https://docs.opendota.com/
 */

const OPENDOTA_BASE_URL = 'https://api.opendota.com/api';

// ──────────────────────────────────────────────
// Toggle this to switch between mock and real API
// true  = always returns a fake live game (for local dev)
// false = hits OpenDota /live endpoint for real data
// ──────────────────────────────────────────────
const USE_MOCK = true;

export interface PlayerSearchResult {
  account_id: number;
  personaname: string;
  avatarfull: string;
  last_match_time: string;
}

export interface LiveGameInfo {
  matchId: number;
  accountId: number;
  playerName: string;
  heroId: number;
  startTime: number;
  isRadiant: boolean;
}

interface OpenDotaLivePlayer {
  account_id: number;
  hero_id: number;
  team: number;    // 0 = Radiant, 1 = Dire
  team_slot: number;
}

interface OpenDotaLiveGame {
  match_id: string;
  activate_time: number;
  game_time: number;
  players: OpenDotaLivePlayer[];
}

/**
 * Search for Dota 2 players by username
 */
export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const response = await fetch(`${OPENDOTA_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`OpenDota API error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Check if a player is currently in a live game.
 * Uses the OpenDota /live endpoint which returns top live games,
 * then scans all players to find the requested account_id.
 */
export async function getPlayerLiveGame(accountId: number, playerName: string): Promise<LiveGameInfo | null> {
  if (USE_MOCK) {
    return getMockLiveGame(accountId, playerName);
  }

  const response = await fetch(`${OPENDOTA_BASE_URL}/live`);
  if (!response.ok) {
    throw new Error(`OpenDota /live API error: ${response.statusText}`);
  }

  const liveGames: OpenDotaLiveGame[] = await response.json();

  for (const game of liveGames) {
    const player = game.players.find((p) => p.account_id === accountId);
    if (player) {
      return {
        matchId: Number(game.match_id),
        accountId,
        playerName,
        heroId: player.hero_id,
        startTime: game.activate_time,
        isRadiant: player.team === 0,
      };
    }
  }

  return null;
}

/**
 * Mock: always returns a fake live game (for local development)
 */
function getMockLiveGame(accountId: number, playerName: string): LiveGameInfo {
  const mockMatchId = Math.floor(Math.random() * 1000000000) + 7000000000;
  return {
    matchId: mockMatchId,
    accountId,
    playerName,
    heroId: Math.floor(Math.random() * 120) + 1,
    startTime: Math.floor(Date.now() / 1000) - 15 * 60,
    isRadiant: Math.random() > 0.5,
  };
}

/**
 * Get full match details
 */
export async function getMatchDetails(matchId: number) {
  const response = await fetch(`${OPENDOTA_BASE_URL}/matches/${matchId}`);
  if (!response.ok) {
    throw new Error(`OpenDota API error: ${response.statusText}`);
  }
  return response.json();
}
