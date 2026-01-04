"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    return createQueryClient();
  }
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();


export type RouterInputs = inferRouterInputs<AppRouter>;

export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: () => process.env.NODE_ENV === "development",
          logger: (op) => {
            // Next.js dev overlay is triggered by console.error. tRPC's default logger
            // uses console.error for errors, which can spam the overlay during auth
            // transitions and cancellations. We instead:
            // - ignore expected UNAUTHORIZED / abort / cancel noise
            // - log real errors via console.warn

            if (op.direction !== "down") return;
            if (!(op.result instanceof Error)) return;

            const err = op.result as unknown as {
              name?: string;
              message?: string;
              data?: { code?: string };
            };

            const code = err?.data?.code;
            const message = (err?.message ?? "").toLowerCase();
            const name = (err?.name ?? "").toLowerCase();

            if (code === "UNAUTHORIZED" || message.includes("unauthorized")) return;
            if (name.includes("abort") || message.includes("abort") || message.includes("cancel")) return;

            // Use warn to avoid Next.js console-error overlay spam.
            console.warn(`tRPC ${op.type} ${op.path} failed`, {
              input: op.input,
              error: err,
            });
          },
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
