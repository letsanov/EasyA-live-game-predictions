/**
 * OpenDota API Service
 * https://docs.opendota.com/
 */

const OPENDOTA_BASE_URL = 'https://api.opendota.com/api';

export interface PlayerSearchResult {
  account_id: number;
  personaname: string;
  avatarfull: string;
  last_match_time: string;
}

export interface RecentMatch {
  match_id: number;
  player_slot: number;
  radiant_win: boolean;
  duration: number;
  game_mode: number;
  lobby_type: number;
  hero_id: number;
  start_time: number;
  version: number;
  kills: number;
  deaths: number;
  assists: number;
}

export interface LiveGameInfo {
  matchId: number;
  accountId: number;
  playerName: string;
  heroId: number;
  startTime: number;
  isRadiant: boolean;
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
 * Get recent matches for a player
 */
export async function getRecentMatches(accountId: number): Promise<RecentMatch[]> {
  const response = await fetch(`${OPENDOTA_BASE_URL}/players/${accountId}/recentMatches`);
  if (!response.ok) {
    throw new Error(`OpenDota API error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Check if a player is currently in a live game
 * Returns live game info if found, null otherwise
 */
export async function getPlayerLiveGame(accountId: number, playerName: string): Promise<LiveGameInfo | null> {
  // TESTING MODE: Return mock live game for any player
  // TODO: Remove this and use real logic below for production
  const mockMatchId = Math.floor(Math.random() * 1000000000) + 7000000000;
  return {
    matchId: mockMatchId,
    accountId,
    playerName,
    heroId: Math.floor(Math.random() * 120) + 1, // Random hero ID
    startTime: Math.floor(Date.now() / 1000) - (15 * 60), // Started 15 minutes ago
    isRadiant: Math.random() > 0.5,
  };

  // REAL LOGIC (currently disabled for testing):
  // const recentMatches = await getRecentMatches(accountId);
  //
  // if (recentMatches.length === 0) {
  //   return null;
  // }
  //
  // const mostRecent = recentMatches[0];
  // const now = Math.floor(Date.now() / 1000);
  // const twoHoursAgo = now - (2 * 60 * 60);
  //
  // const isLive = mostRecent.start_time > twoHoursAgo && mostRecent.duration < 60;
  //
  // if (!isLive) {
  //   return null;
  // }
  //
  // return {
  //   matchId: mostRecent.match_id,
  //   accountId,
  //   playerName,
  //   heroId: mostRecent.hero_id,
  //   startTime: mostRecent.start_time,
  //   isRadiant: mostRecent.player_slot < 128,
  // };
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
