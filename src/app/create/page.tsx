// src/app/create/page.tsx
import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SideNav } from "~/app/_components/sideNav";
import { CreateNoteForm } from "~/app/_components/createNoteForm";
import { CreateProjectContainer } from "~/app/_components/createProjectContainer";
import { LogIn, FileText, FolderKanban, ArrowRight } from "lucide-react";

// Professional Design System
const GRADIENT_BG = "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50";
const PRIMARY_BUTTON = "inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105";
const TAB_BUTTON = (isActive: boolean) => 
    `inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-300 ${
        isActive 
            ? 'bg-indigo-600 text-white shadow-lg' 
            : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-indigo-300'
    }`;

// Define the component to accept searchParams
export default async function CreatePage({ searchParams }: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await auth();
  
  // Check what action to display
  const action = searchParams.action as string | undefined;
  const shouldShowNoteForm = action === 'new_note';
  const shouldShowProjectManagement = action === 'new_project';
  
  // If the user is not logged in (Access Denied State)
  if (!session?.user) {
    return (
      <main className={`flex min-h-screen flex-col items-center justify-center ${GRADIENT_BG}`}>
        
        <div className="absolute top-8 right-8 z-10">
          <UserDisplay />
        </div>
        
        <div className="container flex flex-col items-center justify-center gap-10 px-4 py-16 max-w-4xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <LogIn className="text-white" size={40} />
          </div>
          
          <h1 className="text-6xl font-bold text-slate-900 mb-4">
            Authentication Required
          </h1>
          
          <p className="text-xl text-slate-600 mb-8">
            You must be signed in to access your workspace
          </p>
          
          <Link
            href="/api/auth/signin"
            className={PRIMARY_BUTTON}
          >
            <LogIn size={20} />
            Sign in to continue
            <ArrowRight size={20} />
          </Link>
        </div>
      </main>
    );
  }

  // --- CONTENT FOR LOGGED-IN USERS (WITH SIDEBAR) ---
  return (
    <div className={`min-h-screen ${GRADIENT_BG}`}> 
      <SideNav />

      {/* Main content area shifted by SideNav width (ml-16) */}
      <div className="ml-16">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {shouldShowProjectManagement ? "Projects" : shouldShowNoteForm ? "Notes" : "Workspace"}
              </h1>
              <p className="text-sm text-slate-600">
                Welcome back, {session.user.name}
              </p>
            </div>
            <UserDisplay />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/create?action=new_note"
              className={TAB_BUTTON(shouldShowNoteForm)}
            >
              <FileText size={20} /> 
              Create Note
            </Link>
            <Link
              href="/create?action=new_project"
              className={TAB_BUTTON(shouldShowProjectManagement)}
            >
              <FolderKanban size={20} /> 
              Manage Projects
            </Link>
            <Link
              href="/create"
              className={TAB_BUTTON(!shouldShowNoteForm && !shouldShowProjectManagement)}
            >
              Overview
            </Link>
          </div>

          {/* CONDITIONAL RENDERING FOR MAIN WORK AREA */}
          {shouldShowProjectManagement ? (
            // Show Project Management Interface
            <CreateProjectContainer userId={session.user.id} />
          ) : shouldShowNoteForm ? (
            // Show Note Creation Form
            <div className="max-w-2xl mx-auto">
              <CreateNoteForm />
            </div>
          ) : (
            // Show Welcome Screen
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Welcome to Your Workspace
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                This is your centralized creation hub. Choose an action above to get started.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Link 
                  href="/create?action=new_note"
                  className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 hover:shadow-lg group"
                >
                  <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Create Notes</h3>
                  <p className="text-slate-600">
                    Write secure notes and documents with optional encryption
                  </p>
                </Link>

                <Link 
                  href="/create?action=new_project"
                  className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 hover:shadow-lg group"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FolderKanban className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Manage Projects</h3>
                  <p className="text-slate-600">
                    Create projects, assign tasks, and collaborate with your team
                  </p>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}