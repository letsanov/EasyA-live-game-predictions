import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { searchPlayers, getPlayerLiveGame } from '../services/opendota.js';

export const playersRouter = router({
  /**
   * Search for Dota 2 players by username
   */
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const results = await searchPlayers(input.query);
      return results;
    }),

  /**
   * Check if a player is currently in a live game
   */
  checkLiveGame: publicProcedure
    .input(z.object({
      accountId: z.number(),
      playerName: z.string(),
    }))
    .query(async ({ input }) => {
      const liveGame = await getPlayerLiveGame(input.accountId, input.playerName);
      return liveGame;
    }),
});
