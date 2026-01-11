
import { eventRouter } from "~/server/api/routers/event";
import { noteRouter } from "~/server/api/routers/note";
import { projectRouter } from "~/server/api/routers/project";
import { taskRouter } from "~/server/api/routers/task";
import { organizationRouter } from "~/server/api/routers/organization"; // NEW
import { userRouter } from "~/server/api/routers/user"; // NEW
import { notificationRouter } from "~/server/api/routers/notification"; // NEW
import { settingsRouter } from "~/server/api/routers/settings";
import { authRouter } from "~/server/api/routers/auth";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { chatRouter } from "~/server/api/routers/chat";


export const appRouter = createTRPCRouter({
  event: eventRouter,
  settings: settingsRouter,
  note: noteRouter,
  project: projectRouter,
  task: taskRouter,
  organization: organizationRouter, 
  user: userRouter, 
  auth: authRouter,
  notification: notificationRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;


export const createCaller = createCallerFactory(appRouter);