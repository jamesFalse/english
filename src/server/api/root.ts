import { wordRouter } from "~/server/api/routers/word";
import { analyzeRouter } from "~/server/api/routers/analyze";
import { grammarRouter } from "~/server/api/routers/grammar";
import { bridgeRouter } from "~/server/api/routers/bridge";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  word: wordRouter,
  analyze: analyzeRouter,
  grammar: grammarRouter,
  bridge: bridgeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
