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
import { ThemeToggle } from "~/app/_components/themeToggle";

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
      <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-bg-primary font-faustina">
        <div className="absolute top-8 right-8 z-10">
          <UserDisplay />
        </div>
        
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-accent-primary/25">
            <LogIn className="text-white" size={40} />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-fg-primary">
            Sign In Required
          </h1>
          
          <p className="text-lg text-fg-secondary">
            Access your workspace and start creating
          </p>
          
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:shadow-2xl hover:shadow-accent-primary/25 transition-transform transition-shadow hover:scale-[1.02] group"
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
    <div className="min-h-screen bg-bg-primary font-faustina"> 
      <SideNav />

      <div className="lg:ml-16 min-h-screen flex flex-col pt-16 lg:pt-0">
        <header className="sticky top-0 z-30 glass-effect border-b border-border-light">
          <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                shouldShowProjectManagement 
                  ? 'bg-accent-primary'
                  : shouldShowNoteForm
                  ? 'bg-warning'
                  : 'bg-success'
              }`}>
                {shouldShowProjectManagement ? (
                  <FolderKanban className="text-white" size={22} />
                ) : shouldShowNoteForm ? (
                  <FileEdit className="text-bg-primary" size={22} />
                ) : (
                  <FolderKanban className="text-white" size={22} />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-fg-primary tracking-tight">
                  {shouldShowProjectManagement ? 'Projects' : shouldShowNoteForm ? 'Notes' : 'Workspace'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <NotificationSystem />
              <UserDisplay />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full px-8 py-6 overflow-auto">
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
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10 rounded-3xl mb-8 shadow-lg shadow-accent-primary/15">
                  <FolderKanban className="text-accent-primary" size={36} />
                </div>
                <h2 className="text-3xl font-bold text-fg-primary mb-4">
                  Welcome to your workspace
                </h2>
                <p className="text-fg-secondary text-lg mb-8 leading-relaxed">
                  Manage projects, track progress, and collaborate with your team
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-bg-secondary/40 rounded-xl border border-border-light/20 text-sm text-fg-secondary">
                  <span>Click the</span>
                  <span className="inline-flex items-center justify-center w-7 h-7 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg text-white font-bold shadow-lg shadow-accent-primary/25">+</span>
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