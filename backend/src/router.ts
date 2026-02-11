import { router, publicProcedure } from './trpc';
import { playersRouter } from './routers/players';
import { getNetwork } from './config/networks';

export const appRouter = router({
  players: playersRouter,
  networkConfig: publicProcedure.query(() => {
    const net = getNetwork();
    return {
      network: process.env.BLOCKCHAIN_NETWORK || 'localhost',
      chainId: net.chainId,
      rpcUrl: net.rpcUrl,
      contractAddress: net.contractAddress,
      usdcAddress: net.usdcAddress,
    };
  }),
});

export type AppRouter = typeof appRouter;
