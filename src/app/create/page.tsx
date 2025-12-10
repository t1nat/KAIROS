import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SideNav } from "~/app/_components/sideNav";
import { CreateNoteForm } from "~/app/_components/createNoteForm";
import { CreateProjectContainer } from "~/app/_components/createProjectContainer";
import { NotesList } from "~/app/_components/notesList";
import { NotificationSystem } from "~/app/_components/notificationSystem";
import { ProjectsListWorkspace } from "~/app/_components/projectsListWorkspace";
import { LogIn, ArrowRight, FolderKanban, FileEdit } from "lucide-react";

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#181F25]"style={{ fontFamily: 'Faustina, serif' }}>
        <div className="absolute top-8 right-8 z-10">
          <UserDisplay />
        </div>
        
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#A343EC] to-[#9448F2] rounded-2xl flex items-center justify-center shadow-lg shadow-[#A343EC]/30">
            <LogIn className="text-white" size={40} />
          </div>
          
          <h1 className="text-5xl font-bold text-[#FBF9F5]">
            Sign In Required
          </h1>
          
          <p className="text-lg text-[#E4DEEA]">
            Access your workspace and start creating
          </p>
          
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#A343EC] to-[#9448F2] text-white font-semibold rounded-xl hover:shadow-2xl hover:shadow-[#A343EC]/30 transition-all hover:scale-105 group"
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
    <div className="min-h-screen bg-[#181F25]"> 
      <SideNav />

      <div className="lg:ml-16 min-h-screen flex flex-col pt-16 lg:pt-0">
        <header className="sticky top-0 z-30 bg-[#181F25]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                shouldShowProjectManagement 
                  ? 'bg-[#A343EC]'
                  : shouldShowNoteForm
                  ? 'bg-[#F8D45E]'
                  : 'bg-[#80C49B]'
              }`}>
                {shouldShowProjectManagement ? (
                  <FolderKanban className="text-white" size={22} />
                ) : shouldShowNoteForm ? (
                  <FileEdit className="text-[#181F25]" size={22} />
                ) : (
                  <FolderKanban className="text-white" size={22} />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#FBF9F5] tracking-tight" style={{ fontFamily: 'Faustina, serif' }}>
                  {shouldShowProjectManagement ? 'Projects' : shouldShowNoteForm ? 'Notes' : 'Workspace'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationSystem />
              <UserDisplay />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full px-8 py-6 overflow-auto"style={{ fontFamily: 'Faustina, serif' }}>
          {shouldShowProjectManagement ? (
            <div className="relative w-full h-full">
              <CreateProjectContainer userId={session.user.id} />
            </div>
          ) : shouldShowNoteForm ?(
                <div className="flex gap-6 w-full">
                   <div className="w-96 flex-shrink-0">
                       <CreateNoteForm />
                   </div>
                    <div className="flex-1">
                          <NotesList />
                    </div>
                   </div>
          ) : (
            <div className="flex flex-col items-center justify-start pt-16 pb-20 max-w-7xl mx-auto">
              <div className="text-center max-w-lg mb-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#A343EC]/20 to-[#9448F2]/10 rounded-3xl mb-8 shadow-lg shadow-[#A343EC]/20">
                  <FolderKanban className="text-[#A343EC]" size={36} />
                </div>
                <h2 className="text-3xl font-bold text-[#FBF9F5] mb-4 font-faustina">
                  Welcome to your workspace
                </h2>
                <p className="text-[#E4DEAA] text-lg mb-8 leading-relaxed font-faustina">
                  Manage projects, track progress, and collaborate with your team
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-xl border border-white/10 text-sm text-[#E4DEAA] font-faustina">
                  <span>Click the</span>
                  <span className="inline-flex items-center justify-center w-7 h-7 bg-gradient-to-br from-[#A343EC] to-[#9448F2] rounded-lg text-white font-bold shadow-lg shadow-[#A343EC]/30">+</span>
                  <span>icon to create</span>
                </div>
              </div>
              
              <div className="w-full">
                <ProjectsListWorkspace />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}