import { ProjectsListWorkspace } from "~/components/projects/ProjectsListClient";
import { SideNav } from "~/components/layout/SideNav";

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <SideNav />
      <div className="lg:ml-16 min-h-screen pt-16 lg:pt-0 kairos-page-enter">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8">
          <ProjectsListWorkspace />
        </div>
      </div>
    </div>
  );
}
