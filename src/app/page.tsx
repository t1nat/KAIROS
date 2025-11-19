// src/app/page.tsx - FIXED VERSION (no latestPost prop)

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { HomeClient } from "./homeClient";

export default async function Home() {
    const hello = await api.post.hello({ text: "from tRPC" });
    const session = await auth();

    return (
        <HydrateClient>
            <HomeClient 
                hello={hello} 
                session={session}
            />
        </HydrateClient>
    );
}