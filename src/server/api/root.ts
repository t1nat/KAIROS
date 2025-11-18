// src/server/api/root.ts (Ensure your root router looks like this)
import { postRouter } from "~/server/api/routers/post"; 
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { noteRouter } from "./routers/note";

export const appRouter = createTRPCRouter({
  post: postRouter,
  note: noteRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter); // <-- THIS LINE IS CRITICAL