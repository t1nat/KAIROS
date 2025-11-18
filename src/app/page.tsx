import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { HomeClient } from "./homeClient"; // Import the new client wrapper
import { LatestPost } from "~/app/_components/post"; // Keep import for post

export default async function Home() {
    const hello = await api.post.hello({ text: "from tRPC" });
    const session = await auth();

    if (session?.user) {
        // Prefetch is still useful here
        void api.post.getLatest.prefetch();
    }
    
    // Server-side rendering the LatestPost component
    const latestPostComponent = session?.user ? <LatestPost /> : null;

    return (
        <HydrateClient>
            <HomeClient 
                hello={hello} 
                session={session}
                latestPost={latestPostComponent}
            />
        </HydrateClient>
    );
}