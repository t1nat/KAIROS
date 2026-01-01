import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { HomeClient } from "~/components/homepage/HomeClient";

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