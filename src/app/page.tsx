import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { HydrateClient } from "~/trpc/server";
import { HomeClient } from "~/components/homepage/HomeClient";

export default async function Home() {
    const session = await auth();

    // Authenticated users are redirected to the workspace — landing page is pre-auth only
    if (session?.user) {
        redirect("/create");
    }

    return (
        <HydrateClient>
            <HomeClient />
        </HydrateClient>
    );
}