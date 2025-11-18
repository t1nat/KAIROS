// src/app/create/page.tsx
import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SideNav } from "~/app/_components/sideNav";
import { CreateNoteForm } from "~/app/_components/createNoteForm"; // <-- IMPORT CLIENT COMPONENT

export default async function CreatePage() {
  const session = await auth();

  // If the user is not logged in
  if (!session?.user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFEE8] text-white">
        {/* Access Denied Content */}
        <div className="absolute top-8 right-8 z-10">
          <UserDisplay />
        </div>
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
          <h1 className="text-6xl font-extrabold tracking-tight text-[#140C00] sm:text-[7rem]">
            Access Denied
          </h1>
          <div className="text-center text-3xl text-[#140C00]">
            <p className="mb-4">Please sign in to create content.</p>
            <Link
              href="/api/auth/signin"
              className="rounded-full bg-white/20 px-8 py-3 text-xl text-[#140C00] font-semibold no-underline transition hover:bg-white/30"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // --- CONTENT FOR LOGGED-IN USERS (WITH SIDEBAR) ---
  return (
    <div className="overflow-hidden"> 
      <SideNav />

      <div className="ml-16">
        <section className="flex min-h-screen flex-col items-center justify-center bg-[#FFFEE8] text-white py-16"> 
          
          <div className="absolute top-8 right-8 z-10">
            <UserDisplay />
          </div>
          
          <div className="container flex flex-col items-center justify-center gap-8 px-4">
            
            <h1 className="text-6xl font-extrabold tracking-tight text-[#140C00] sm:text-[7rem] text-center">
              Create Sticky Note
            </h1>
            
            <p className="text-xl text-[#140C00] text-center">
                Hello, {session.user.name}! Write down your secure note here.
            </p>

            {/* RENDER THE CLIENT COMPONENT */}
            <CreateNoteForm />
            
          </div>
        </section>
      </div>
    </div>
  );
}