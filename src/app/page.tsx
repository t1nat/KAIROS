// src/app/page.tsx
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { HomeClient } from "./homeClient";

export default async function Home() {
    const session = await auth();

    return (
        <HydrateClient>
            <HomeClient 
                session={session}
            />
        </HydrateClient>
    );
}