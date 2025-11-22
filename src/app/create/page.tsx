// src/app/create/page.tsx
import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SideNav } from "~/app/_components/sideNav";
import { CreateNoteForm } from "~/app/_components/createNoteForm";
import { CreateProjectContainer } from "~/app/_components/createProjectContainer";
import { NotesList } from "~/app/_components/notesList";
import { LogIn, ArrowRight, Sparkles } from "lucide-react";

export default async function CreatePage({ 
    searchParams 
}: { 
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const action = resolvedSearchParams.action as string | undefined;
  
  const shouldShowNoteForm = action === 'new_note';
  const shouldShowProjectManagement = action === 'new_project';
  
  // If the user is not logged in
  if (!session?.user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FCFBF9] via-white to-[#FCFBF9]">
        <div className="absolute top-8 right-8 z-10">
          <UserDisplay />
        </div>
        
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#9448F2] to-[#80C49B] rounded-2xl flex items-center justify-center shadow-lg">
            <LogIn className="text-white" size={40} />
          </div>
          
          <h1 className="text-5xl font-bold text-[#222B32]">
            Sign In Required
          </h1>
          
          <p className="text-lg text-[#59677C]">
            Access your workspace and start creating
          </p>
          
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-xl hover:shadow-2xl transition-all hover:scale-105 group"
          >
            <LogIn size={20} />
            Sign in to continue
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FCFBF9] via-white to-[#F8F5FF]"> 
      <SideNav />

      {/* Main content area */}
      <div className="ml-16">
        {/* Refined Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#DDE3E9]/50 shadow-sm">
          <div className="max-w-6xl mx-auto px-8 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-gradient-to-b from-[#9448F2] to-[#80C49B] rounded-full" />
              <div>
                <h1 className="text-xl font-bold text-[#222B32] tracking-tight">
                  {shouldShowProjectManagement ? "Projects" : shouldShowNoteForm ? "Secure Notes" : "Workspace"}
                </h1>
                <p className="text-xs text-[#59677C]">
                  {shouldShowProjectManagement ? "Manage your projects and tasks" : shouldShowNoteForm ? "Create encrypted notes" : "Your creative space"}
                </p>
              </div>
            </div>
            <UserDisplay />
          </div>
        </header>

        {/* Main Content - Refined */}
        <main className="max-w-6xl mx-auto px-8 py-6">
          {shouldShowProjectManagement ? (
            <div className="space-y-4">
              <CreateProjectContainer userId={session.user.id} />
            </div>
          ) : shouldShowNoteForm ? (
            <div className="space-y-5">
              <CreateNoteForm />
              <NotesList />
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#9448F2]/10 to-[#80C49B]/10 rounded-2xl mb-6">
                  <Sparkles className="text-[#9448F2]" size={28} />
                </div>
                <h2 className="text-2xl font-bold text-[#222B32] mb-3">
                  Welcome to your workspace
                </h2>
                <p className="text-[#59677C] mb-6">
                  Use the sidebar to get started with projects, notes, or events
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[#DDE3E9] text-sm text-[#59677C]">
                  <span>Click the</span>
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gradient-to-br from-[#9448F2] to-[#80C49B] rounded-md text-white font-bold">+</span>
                  <span>icon to create</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}