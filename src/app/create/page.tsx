import Link from "next/link";
import { auth } from "~/server/auth";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { SideNav } from "~/components/layout/SideNav";
import { CreateNoteForm } from "~/components/notes/CreateNoteForm";
import { CreateProjectContainer } from "~/components/projects/CreateProjectContainer";
import { NotesList } from "~/components/notes/NotesList";
import { NotificationSystem } from "~/components/notifications/NotificationSystem";
import { ProjectsListWorkspace } from "~/components/projects/ProjectsListWorkspace";
import { LogIn, ArrowRight, FolderKanban, FileEdit } from "lucide-react";
import { OrgAccessCodeBadge } from "~/components/orgs/OrgAccessCodeBadge";
import { OrgSwitcher } from "~/components/orgs/OrgSwitcher";
import { getTranslations } from "next-intl/server";

export default async function CreatePage({ 
    searchParams 
}: { 
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth();
  const tCreate = await getTranslations("create");
  const tAuth = await getTranslations("auth");
  const tNav = await getTranslations("nav");
  const resolvedSearchParams = await searchParams;
  const action = resolvedSearchParams.action as string | undefined;
  
  const shouldShowNoteForm = action === 'new_note';
  const shouldShowProjectManagement = action === 'new_project';
  
  // If the user is not logged in
  if (!session?.user) {
    return (
      <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-bg-primary">
        <div className="absolute top-8 right-8 z-10">
          <UserDisplay />
        </div>
        
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-accent-primary/25">
            <LogIn className="text-white" size={40} />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-fg-primary">
            {tAuth("signIn")}
          </h1>
          
          <p className="text-lg text-fg-secondary">
            {tCreate("subtitle")}
          </p>
          
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:shadow-2xl hover:shadow-accent-primary/25 transition-transform transition-shadow hover:scale-[1.02] group"
          >
            <LogIn size={20} />
            {tAuth("signIn")}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary"> 
      <SideNav />

      <div className="lg:ml-16 min-h-screen flex flex-col pt-16 lg:pt-0">
        <header className="sticky top-16 lg:top-0 z-30 topbar-solid ios-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
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
                  {shouldShowProjectManagement
                    ? tNav("projects")
                    : shouldShowNoteForm
                      ? tNav("notes")
                      : tCreate("title")}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <OrgSwitcher />
              <OrgAccessCodeBadge />
              <NotificationSystem />
              <UserDisplay />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full px-4 sm:px-6 md:px-8 py-5 sm:py-6 overflow-auto relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full blur-3xl bg-gradient-to-br from-accent-primary/10 via-brand-indigo/10 to-brand-cyan/10" />
            <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] rounded-full blur-3xl bg-gradient-to-tr from-brand-teal/10 via-accent-secondary/10 to-transparent" />
          </div>

          {shouldShowProjectManagement ? (
            <div className="relative w-full h-full">
              <CreateProjectContainer userId={session.user.id} />
            </div>
          ) : shouldShowNoteForm ?(
              <div className="flex flex-col lg:flex-row gap-4 w-full h-[calc(100vh-140px)]">
                 <div className="w-full lg:w-[400px] lg:flex-shrink-0 flex flex-col ios-card p-4">
                       <CreateNoteForm />
                   </div>
                    <div className="flex-1 ios-card p-4 overflow-hidden">
                          <NotesList />
                    </div>
                   </div>
          ) : (
              <div className="relative max-w-7xl mx-auto pt-10 pb-20">
                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/10 text-xs font-semibold text-accent-primary shadow-sm">
                      {tCreate("title")}
                    </div>
                    <h2 className="mt-4 text-3xl md:text-4xl font-bold text-fg-primary tracking-tight">
                      {tCreate("headline")}
                    </h2>
                    <p className="mt-3 text-fg-secondary text-base md:text-lg leading-relaxed max-w-xl">
                      {tCreate("tagline")}
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl ios-card text-sm text-fg-secondary">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary text-white font-bold shadow-sm">+</span>
                        <span>{tCreate("cta")}</span>
                      </div>
                    </div>
                  </div>
                </div>


              </div>
          )}
        </main>
      </div>
    </div>
  );
}