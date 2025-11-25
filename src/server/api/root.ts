// src/server/api/root.ts

import { postRouter } from "~/server/api/routers/post";
import { eventRouter } from "~/server/api/routers/event";
import { noteRouter } from "~/server/api/routers/note";
import { projectRouter } from "~/server/api/routers/project";
import { taskRouter } from "~/server/api/routers/task";
import { organizationRouter } from "~/server/api/routers/organization"; // NEW
import { userRouter } from "~/server/api/routers/user"; // NEW
import { documentRouter } from "~/server/api/routers/document"; // NEW
import { notificationRouter } from "~/server/api/routers/notification"; // NEW
import { settingsRouter } from "~/server/api/routers/settings";
import { authRouter } from "~/server/api/routers/auth";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  event: eventRouter,
  settings: settingsRouter,
  note: noteRouter,
  project: projectRouter,
  task: taskRouter,
  organization: organizationRouter, // ADD THIS
  user: userRouter, // ADD THIS
  document: documentRouter, 
  auth: authRouter,
  notification: notificationRouter,
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