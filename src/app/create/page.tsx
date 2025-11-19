// src/app/create/page.tsx
import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SideNav } from "~/app/_components/sideNav";
import { CreateNoteForm } from "~/app/_components/createNoteForm";
import { CreateProjectContainer } from "~/app/_components/createProjectContainer";
import { LogIn, FileText, FolderOpen } from "lucide-react";

// --- Monochromatic/Elegant Style Constants ---
const BG_PRIMARY = "bg-gray-50"; // Light background
const TEXT_DARK = "text-gray-900"; // Primary text
const TEXT_SUBTLE = "text-gray-600"; // Secondary text
const BORDER_LIGHT = "border-gray-200";
const BUTTON_SIGNIN_STYLE = `rounded-lg bg-gray-900 px-8 py-3 text-xl font-semibold text-white transition hover:bg-gray-700 shadow-lg`;
const CARD_STYLE = `bg-white rounded-xl shadow-xl p-10 border ${BORDER_LIGHT}`; 

// Monochromatic Buttons for persistent navigation (Dynamically styled based on active state)
const BUTTON_NOTE_STYLE = (isActive: boolean) => 
    `px-6 py-3 text-lg font-medium rounded-lg transition duration-200 shadow-sm flex items-center gap-2 ${
        isActive 
            ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/30' 
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
    }`;
const BUTTON_PROJECT_STYLE = (isActive: boolean) =>
    `px-6 py-3 text-lg font-medium rounded-lg transition duration-200 shadow-sm flex items-center gap-2 ${
        isActive 
            ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/30' 
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
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
      <main className={`flex min-h-screen flex-col items-center justify-center ${BG_PRIMARY}`}>
        
        <div className="absolute top-8 right-8 z-10">
          <UserDisplay />
        </div>
        
        <div className="container flex flex-col items-center justify-center gap-10 px-4 py-16 max-w-4xl text-center">
          <h1 className={`text-7xl font-light tracking-tight ${TEXT_DARK} sm:text-[6rem] border-b pb-4 ${BORDER_LIGHT}`}>
            Access Denied
          </h1>
          
          <div className={`text-center text-2xl ${TEXT_SUBTLE}`}>
            <p className="mb-6">You must be authenticated to view this workspace.</p>
            <Link
              href="/api/auth/signin"
              className={BUTTON_SIGNIN_STYLE}
            >
              <LogIn size={20} className="inline mr-2" />
              Sign in to continue
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // --- CONTENT FOR LOGGED-IN USERS (WITH SIDEBAR) ---
  return (
    <div className="overflow-hidden min-h-screen bg-gray-100"> 
      <SideNav />

      {/* Main content area shifted by SideNav width (ml-16) */}
      <div className="ml-16">
        <section className={`flex min-h-screen flex-col items-start ${BG_PRIMARY} pt-8 px-8 pb-16`}> 
          
          {/* UserDisplay is positioned outside the main flow */}
          <div className="absolute top-8 right-8 z-10">
            <UserDisplay />
          </div>
          
          <div className="container max-w-7xl mx-auto">
            
            {/* Main Header Block */}
            <div className="mb-8 pt-4 pb-2 border-b border-gray-300">
              <h1 className={`text-4xl font-extrabold tracking-tight ${TEXT_DARK} mb-2`}>
                {shouldShowProjectManagement ? "Project Management Console" : "Document Workspace"}
              </h1>
              <p className={`text-lg ${TEXT_SUBTLE}`}>
                Welcome, {session.user.name}. Select an action below or use the sidebar.
              </p>
            </div>

            {/* PERSISTENT ACTION LINKS (New block, always visible) */}
            <div className="flex gap-4 justify-start mb-10">
              <Link
                href="/create?action=new_note"
                className={BUTTON_NOTE_STYLE(shouldShowNoteForm)}
              >
                <FileText size={20} /> Create New Document
              </Link>
              <Link
                href="/create?action=new_project"
                className={BUTTON_PROJECT_STYLE(shouldShowProjectManagement)}
              >
                <FolderOpen size={20} /> Manage New Project
              </Link>
            </div>

            {/* CONDITIONAL RENDERING FOR MAIN WORK AREA */}
            {shouldShowProjectManagement ? (
              // Show Project Management Interface
              <CreateProjectContainer userId={session.user.id} />
            ) : shouldShowNoteForm ? (
              // Show Note Creation Form
              <CreateNoteForm />
            ) : (
              // Show Welcome Screen
              <div className={CARD_STYLE}>
                <h2 className={`text-3xl font-bold ${TEXT_DARK} mb-4 border-b pb-2 border-gray-200`}>
                  Workspace Overview
                </h2>
                <p className={`${TEXT_SUBTLE} text-lg`}>
                  This is your centralized creation hub. Select an action above or use the side navigation to manage documents and projects.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}