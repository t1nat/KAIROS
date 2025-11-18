// src/app/create/page.tsx
import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SideNav } from "~/app/_components/sideNav";
import { CreateNoteForm } from "~/app/_components/createNoteForm";

// Define the component to accept searchParams
export default async function CreatePage({ searchParams }: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await auth();
  
  // Check if the URL parameter indicates we should show the form
  const shouldShowNoteForm = searchParams.action === 'new_note';
  
  // If the user is not logged in... (Rest of this block is unchanged)
  if (!session?.user) {
    // ... (Access Denied content)
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

      {/* Main content area shifted by SideNav width (ml-16) */}
      <div className="ml-16">
        <section className="flex min-h-screen flex-col items-start bg-[#FFFEE8] text-white pt-16 px-8 pb-16"> 
          
          <div className="absolute top-8 right-8 z-10">
            <UserDisplay />
          </div>
          
          <div className="container flex flex-col items-start gap-8">
            
            <h1 className="text-5xl font-extrabold tracking-tight text-[#140C00]">
              Create Document
            </h1>
            
            <p className="text-lg text-[#140C00]">
                Hello, {session.user.name}! Choose an option from the menu, or start a new note.
            </p>

            {/* CONDITIONAL RENDERING OF THE FORM */}
            {shouldShowNoteForm ? (
              <CreateNoteForm />
            ) : (
              // Display only the placeholder div if the action is not 'new_note'
              <div className="p-6 bg-white/50 rounded-lg shadow-inner border border-gray-300">
                <p className="text-sm text-gray-600 mt-2">
                  (The form will appear here after selection)
                </p>
              </div>
            )}
            
          </div>
        </section>
      </div>
    </div>
  );
}