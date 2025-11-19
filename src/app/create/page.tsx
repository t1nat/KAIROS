// src/app/create/page.tsx
import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SideNav } from "~/app/_components/sideNav";
import { CreateNoteForm } from "~/app/_components/createNoteForm";
import { CreateProjectContainer } from "~/app/_components/createProjectContainer";

// Define the component to accept searchParams
export default async function CreatePage({ searchParams }: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await auth();
  
  // Check what action to display
  const action = searchParams.action as string | undefined;
  const shouldShowNoteForm = action === 'new_note';
  const shouldShowProjectManagement = action === 'new_project';
  
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

      {/* Main content area shifted by SideNav width (ml-16) */}
      <div className="ml-16">
        <section className="flex min-h-screen flex-col items-start bg-[#FFFEE8] text-white pt-8 px-8 pb-16"> 
          
          <div className="absolute top-8 right-8 z-10">
            <UserDisplay />
          </div>
          
          <div className="container max-w-7xl mx-auto">
            
            <div className="mb-8">
              <h1 className="text-5xl font-extrabold tracking-tight text-[#140C00] mb-2">
                {shouldShowProjectManagement ? "Create & Collaborate" : "Create Document"}
              </h1>
              <p className="text-lg text-[#140C00]">
                {shouldShowProjectManagement 
                  ? `Hello, ${session.user.name}! Manage your projects, assign tasks, and collaborate in real-time.`
                  : `Hello, ${session.user.name}! Choose an option from the menu, or start a new note.`
                }
              </p>
            </div>

            {/* CONDITIONAL RENDERING BASED ON ACTION */}
            {shouldShowProjectManagement ? (
              // Show Project Management Interface
              <CreateProjectContainer userId={session.user.id} />
            ) : shouldShowNoteForm ? (
              // Show Note Creation Form
              <CreateNoteForm />
            ) : (
              // Show Welcome Screen
              <div className="bg-white/70 rounded-lg shadow-md p-8 text-center">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Welcome to Your Workspace
                </h2>
                <p className="text-gray-600 mb-6">
                  Choose an option from the sidebar to get started:
                </p>
                <ul className="text-left max-w-md mx-auto space-y-2 text-gray-700">
                  <li>• Create a new note for quick documentation</li>
                  <li>• Create a project to organize your tasks</li>
                  <li>• Collaborate with team members in real-time</li>
                  <li>• Track progress with interactive timelines</li>
                  <li>• Assign roles and manage permissions</li>
                </ul>
                
                {/* Quick Action Buttons */}
                <div className="flex gap-4 justify-center mt-8">
                  <Link
                    href="/create?action=new_note"
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
                  >
                    Create Note
                  </Link>
                  <Link
                    href="/create?action=new_project"
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
                  >
                    Create Project
                  </Link>
                </div>
              </div>
            )}
            
          </div>
        </section>
      </div>
    </div>
  );
}