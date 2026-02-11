import { router } from './trpc';
import { authRouter } from './routers/auth';
import { playersRouter } from './routers/players';

export const appRouter = router({
  auth: authRouter,
  players: playersRouter,
});

export type AppRouter = typeof appRouter;
