"use client";

import { useState, useEffect } from"react";
import { api } from"~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from"./ProjectManagement";
import { InteractiveTimeline } from"./InteractiveTimeline";
import { AiTaskPlannerPanel } from"./AiTaskPlannerPanel";
import { ChevronDown, RefreshCw, CheckCircle2, ArrowLeft, Folder, Trash2, Users, Plus } from"lucide-react";
import { useSearchParams } from"next/navigation";
import { useTranslations } from"next-intl";
import { useToast } from"~/components/providers/ToastProvider";

type Translator = (key: string, values?: Record<string, unknown>) => string;

interface CreateProjectContainerProps {
 userId: string;
}

interface CreateProjectInput {
 title: string;
 description: string;
 shareStatus:"private" |"shared_read" |"shared_write";
}

interface CreateTaskInput {
 title: string;
 description: string;
 assignedToId?: string;
 priority:"low" |"medium" |"high" |"urgent";
 dueDate?: Date;
}

interface User {
 id: string;
 name: string | null;
 email: string;
 image: string | null;
}

interface Collaborator {
 user: User;
 permission:"read" |"write";
}

interface Task {
 id: number;
 title: string;
 description: string;
 status:"pending" |"in_progress" |"completed" |"blocked";
 priority:"low" |"medium" |"high" |"urgent";
 dueDate: Date | null;
 assignedTo: {
 id: string;
 name: string | null;
 image: string | null;
 } | null;
 completedAt: Date | null;
 orderIndex: number;
 createdBy?: {
 id: string;
 name: string | null;
 image: string | null;
 } | null;
}

export function CreateProjectContainer({ userId }: CreateProjectContainerProps) {
 const useT = useTranslations as unknown as (namespace: string) => Translator;
 const t = useT("create");
 const toast = useToast();
 const searchParams = useSearchParams();
 const projectIdFromUrl = searchParams?.get("projectId");
 
 const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
 projectIdFromUrl ? parseInt(projectIdFromUrl) : null
 );

 const [isCreateProjectExpanded, setIsCreateProjectExpanded] = useState(false);
 const [deleteProjectArmed, setDeleteProjectArmed] = useState(false);
 const [mounted, setMounted] = useState(false);

 const utils = api.useUtils();

 const { data: projects } = api.project.getMyProjects.useQuery(undefined, {
 staleTime: 1000 * 60 * 5,
 });

 const { data: projectDetails, refetch: refetchProjectDetails } = api.project.getById.useQuery(
 { id: selectedProjectId! },
 { 
 enabled: selectedProjectId !== null,
 staleTime: 1000 * 60,
 }
 );

 useEffect(() => {
 setMounted(true);
 }, []);

 useEffect(() => {
 if (projectIdFromUrl) {
 const id = parseInt(projectIdFromUrl);
 if (!isNaN(id)) {
 setSelectedProjectId(id);
 }
 }
 }, [projectIdFromUrl]);

 useEffect(() => {
 if (!deleteProjectArmed) return;
 const tId = setTimeout(() => setDeleteProjectArmed(false), 4000);
 return () => clearTimeout(tId);
 }, [deleteProjectArmed]);

 const createProject = api.project.create.useMutation({
 onSuccess: (data) => {
 void utils.project.getMyProjects.invalidate();
 if (data) setSelectedProjectId(data.id);
 },
 onError: (error) => toast.error(t("errors.generic", { message: error.message })),
 });

 const createTask = api.task.create.useMutation({
 onSuccess: () => {
 void utils.project.getById.invalidate({ id: selectedProjectId! });
 void utils.project.getMyProjects.invalidate();
 void utils.task.getOrgActivity.invalidate();
 },
 onError: (error) => toast.error(t("errors.generic", { message: error.message })),
 });

 const updateTaskStatus = api.task.updateStatus.useMutation({
 onMutate: async ({ taskId, status, completionNote }) => {
 if (!selectedProjectId) return;
 await utils.project.getById.cancel({ id: selectedProjectId });
 const previousProject = utils.project.getById.getData({ id: selectedProjectId });

 utils.project.getById.setData({ id: selectedProjectId }, (old) => {
 if (!old) return old;
 return {
 ...old,
 tasks: old.tasks?.map((t) => {
 if (t.id !== taskId) return t;
 return {
 ...t,
 status,
 completedAt: status ==="completed" ? new Date() : null,
 // If caller supplies a completion note at the same time, reflect it optimistically.
 // Otherwise keep whatever note we already had.
 completionNote:
 status ==="completed"
 ? completionNote ?? t.completionNote ?? null
 : null,
 };
 }),
 };
 });

 return { previousProject };
 },
 onSuccess: () => {
 setTimeout(() => {
 void utils.project.getById.invalidate({ id: selectedProjectId! });
 void utils.project.getMyProjects.invalidate();
 void utils.task.getOrgActivity.invalidate();
 }, 100);
 },
 onError: (error, _, ctx) => {
 if (ctx?.previousProject && selectedProjectId) {
 utils.project.getById.setData({ id: selectedProjectId }, ctx.previousProject);
 }
 toast.error(t("errors.generic", { message: error.message }));
 },
 });

 const updateTask = api.task.update.useMutation({
 onSuccess: () => {
 void utils.project.getById.invalidate({ id: selectedProjectId! });
 void utils.project.getMyProjects.invalidate();
 void utils.task.getOrgActivity.invalidate();
 toast.success("Task updated");
 },
 onError: (error) => toast.error(t("errors.generic", { message: error.message })),
 });

 const adminDiscardTask = api.task.adminDiscard.useMutation({
 onSuccess: () => {
 void utils.project.getById.invalidate({ id: selectedProjectId! });
 void utils.project.getMyProjects.invalidate();
 void utils.task.getOrgActivity.invalidate();
 toast.success("Task discarded");
 },
 onError: (error) => toast.error(t("errors.generic", { message: error.message })),
 });

 const handleTaskDiscard = (taskId: number) => {
 // Avoid browser confirm() (shows localhost alerts). If you want a custom modal,
 // we can replace this with a proper dialog component.
 adminDiscardTask.mutate({ taskId });
 };

 const addCollaborator = api.project.addCollaborator.useMutation({
 onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
 onError: (e) => toast.error(t("errors.generic", { message: e.message })),
 });

 const removeCollaborator = api.project.removeCollaborator.useMutation({
 onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
 onError: (e) => toast.error(t("errors.generic", { message: e.message })),
 });

 const updateCollaboratorPermission = api.project.updateCollaboratorPermission.useMutation({
 onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
 onError: (e) => toast.error(t("errors.generic", { message: e.message })),
 });

 const deleteProject = api.project.delete.useMutation({
 onSuccess: () => {
 setDeleteProjectArmed(false);
 setSelectedProjectId(null);
 void utils.project.getMyProjects.invalidate();
 toast.success("Project deleted");
 },
 onError: (error) => toast.error(t("errors.generic", { message: error.message })),
 });

 const handleCreateProject = async (data: CreateProjectInput) => createProject.mutate(data);

 const handleCreateTask = async (data: CreateTaskInput) => {
 if (!selectedProjectId) return;
 createTask.mutate({ ...data, projectId: selectedProjectId });
 };

 const handleTaskStatusChange = (taskId: number, status: Task["status"]) =>
 updateTaskStatus.mutate({ taskId, status });

 const setCompletionNote = api.task.setCompletionNote.useMutation({
 onSuccess: () => {
 void utils.project.getById.invalidate({ id: selectedProjectId! });
 void utils.task.getOrgActivity.invalidate();
 },
 onError: (error) => toast.error(t("errors.generic", { message: error.message })),
 });

 const handleTaskCompletionNoteSave = (taskId: number, completionNote: string | null) =>
 setCompletionNote.mutate({ taskId, completionNote });

 const handleTaskUpdate = (taskId: number, patch: { title?: string; description?: string; assignedToId?: string | null; dueDate?: Date | null }) =>
 updateTask.mutate({ taskId, ...patch });

 const handleAddCollaborator = async (email: string, permission:"read" |"write") => {
 if (selectedProjectId) {
 addCollaborator.mutate({ projectId: selectedProjectId, email, permission });
 }
 };

 const handleRemoveCollaborator = async (id: string) => {
 if (selectedProjectId) {
 removeCollaborator.mutate({ projectId: selectedProjectId, collaboratorId: id });
 }
 };

 const handleUpdatePermission = async (id: string, perm:"read" |"write") => {
 if (selectedProjectId) {
 updateCollaboratorPermission.mutate({ projectId: selectedProjectId, collaboratorId: id, permission: perm });
 }
 };

 const handleDeleteProject = () => {
 if (!selectedProjectId) return;

 if (!deleteProjectArmed) {
 setDeleteProjectArmed(true);
 toast.info("Click again to delete project");
 return;
 }

 deleteProject.mutate({ id: selectedProjectId });
 };

 const isOwner = projectDetails?.createdById === userId;
 const hasWriteAccess = projectDetails?.userHasWriteAccess ?? false;

 const availableUsers: User[] = projectDetails
 ? [
 // Owner
 ...(projectDetails.createdById
 ? [
 {
 id: projectDetails.createdById,
 name:
 projectDetails.createdBy?.name ??
 projectDetails.createdBy?.email ??
 t("team.projectOwner"),
 email: projectDetails.createdBy?.email ??"",
 image: projectDetails.createdBy?.image ?? null,
 },
 ]
 : []),
 // Collaborators
 ...(projectDetails.collaborators?.map((c) => ({
 id: c.collaboratorId,
 name: c.collaborator?.name ?? null,
 email: c.collaborator?.email ??"",
 image: c.collaborator?.image ?? null,
 })) ?? []),
 ]
 : [];

 if (!mounted) {
 return (
 <div className="w-full h-full overflow-y-auto bg-bg-primary">
 <div className="animate-pulse">
 <div className="h-12 bg-bg-tertiary rounded-[12px] mx-4 mb-2"></div>
 <div className="h-32 bg-bg-tertiary rounded-[12px] mx-4 mb-2"></div>
 <div className="h-32 bg-bg-tertiary rounded-[12px] mx-4"></div>
 </div>
 </div>
 );
 }

 return (
 <div className="w-full h-full overflow-y-auto bg-bg-primary">
 <div className="max-w-full px-4 sm:px-6">
 {/* Header */}
 <div className="pt-8 pb-6">
 <h1 className="text-[34px] font-[700] leading-[1.1] tracking-[-0.022em] text-fg-primary mb-2">
 {t("projectForm.title")}
 </h1>
 <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] text-fg-tertiary">
 {t("subtitle")}
 </p>
 </div>

 <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 relative w-full">
 {/* Left Sidebar — Projects List & Create */}
 <div className="w-full lg:w-80 xl:w-96 lg:flex-shrink-0 space-y-4">
 {/* Create New Project Card */}
 {!selectedProjectId && (
 <div className="animate-in slide-in-from-top-2 duration-200">
 <div className="bg-bg-secondary rounded-[10px] overflow-hidden border border-white/[0.06]">
 <button
 onClick={() => setIsCreateProjectExpanded(!isCreateProjectExpanded)}
 className="w-full flex items-center justify-between pl-4 pr-[18px] py-[11px] active:bg-bg-tertiary transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="w-[30px] h-[30px] rounded-full text-accent-primary/15 flex items-center justify-center">
 <Plus size={18} className="text-accent-primary" strokeWidth={2.2} />
 </div>
 <div className="flex-1 text-left">
 <div className="text-[17px] leading-[1.235] tracking-[-0.016em] text-fg-primary font-[590]">
 {t("projectForm.title")}
 </div>
 <div className="text-[13px] leading-[1.3846] tracking-[-0.006em] text-fg-secondary">
 {t("projectForm.descriptionPlaceholder")}
 </div>
 </div>
 </div>
 <ChevronDown
 size={20}
 className={`text-fg-tertiary transition-all duration-300 ${isCreateProjectExpanded ?"rotate-180" :""}`}
 strokeWidth={2.5}
 />
 </button>

 {isCreateProjectExpanded && (
 <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
 <div className="pt-4">
 <CreateProjectForm
 onSubmit={handleCreateProject}
 currentUser={{ id: userId, name: null, email:"", image: null }}
 isExpanded={isCreateProjectExpanded}
 onToggle={() => setIsCreateProjectExpanded((s) => !s)}
 />
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Existing Projects List */}
 {!selectedProjectId && projects && projects.length > 0 && (
 <div className="space-y-2 animate-in fade-in duration-300">
 <h2 className="text-[13px] leading-[1.3846] tracking-[-0.006em] text-fg-secondary mb-3 px-1 uppercase tracking-wide">
 {t("projects.myProjects")} ({projects.length})
 </h2>
 <div className="space-y-2">
 {projects.map((project) => (
 <button
 key={project.id}
 onClick={() => setSelectedProjectId(project.id)}
 className="w-full flex items-center justify-between pl-4 pr-[18px] py-[11px] bg-bg-secondary rounded-[10px] border border-white/[0.06] active:bg-bg-tertiary transition-colors group"
 >
 <div className="flex items-center gap-3">
 <div className="w-[30px] h-[30px] rounded-full bg-bg-tertiary flex items-center justify-center">
 <Folder size={18} className="text-fg-secondary" strokeWidth={2.2} />
 </div>
 <div className="flex-1 min-w-0 text-left">
 <p className="text-[17px] leading-[1.235] tracking-[-0.016em] text-fg-primary font-[590] truncate">
 {project.title || t("projects.untitled")}
 </p>
 <p className="text-[13px] leading-[1.3846] tracking-[-0.006em] text-fg-secondary truncate">
 {project.tasks?.length ?? 0} {t("taskForm.taskName")}
 </p>
 </div>
 </div>
 <ChevronDown 
 size={20} 
 className="text-fg-tertiary group-hover:text-accent-primary -rotate-90 transition-colors" 
 strokeWidth={2.5}
 />
 </button>
 ))}
 </div>
 </div>
 )}

 {selectedProjectId && projectDetails && (
 <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
 {/* Project Header Card */}
 <div className="bg-bg-secondary rounded-[10px] overflow-hidden border border-white/[0.06]">
 {/* Back Button & Actions */}
 <div className="flex items-center justify-between px-4 pt-4 pb-3">
 <button
 onClick={() => setSelectedProjectId(null)}
 className="flex items-center gap-2 p-2 text-fg-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-all duration-200 group"
 >
 <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.2} />
 <span className="text-[13px] font-medium">{t("projects.allProjects")}</span>
 </button>

 <div className="flex items-center gap-1">
 <button
 onClick={() => void refetchProjectDetails()}
 className="p-2.5 text-fg-tertiary hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-all duration-200"
 aria-label={t("actions.refresh")}
 >
 <RefreshCw size={16} strokeWidth={2.2} />
 </button>

 {isOwner && (
 <button
 onClick={handleDeleteProject}
 disabled={deleteProject.isPending}
 className={`p-2.5 rounded-xl transition-all duration-200 ${
 deleteProjectArmed
 ?"bg-error/10 text-error"
 :"text-fg-tertiary hover:text-error hover:bg-error/10"
 }`}
 aria-label={deleteProjectArmed ?"Confirm delete project" :"Delete project"}
 >
 <Trash2 size={16} strokeWidth={2.2} />
 </button>
 )}
 </div>
 </div>

 <div className="h-[0.33px] border-t border-white/[0.04] mx-4 mb-4" />

 {/* Project Title & Description */}
 <div className="flex items-start gap-3 px-4 mb-4">
 <div className="w-[44px] h-[44px] rounded-full text-accent-primary/15 flex items-center justify-center">
 <Folder className="text-accent-primary" size={22} strokeWidth={2.2} />
 </div>
 <div className="flex-1 min-w-0">
 <h2 className="text-[20px] font-[590] text-fg-primary mb-1 leading-tight">{projectDetails.title}</h2>
 {projectDetails.description && (
 <p className="text-[13px] leading-[1.3846] tracking-[-0.006em] text-fg-secondary">
 {projectDetails.description}
 </p>
 )}
 </div>
 </div>

 {/* Access Indicator */}
 {!isOwner && (
 <div className="flex items-center gap-2 pt-4 px-4 border-t border-t border-white/[0.04]">
 <span
 className={`inline-flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg font-medium ${
 hasWriteAccess
 ?"text-success bg-success/10"
 :"text-fg-tertiary bg-bg-tertiary/50"
 }`}
 >
 {hasWriteAccess ? (
 <>
 <CheckCircle2 size={12} strokeWidth={2.2} />
 {t("team.canEdit")}
 </>
 ) : (
 t("team.viewOnly")
 )}
 </span>
 </div>
 )}

 {/* Team Members Section */}
 {isOwner && (
 <div className="mt-4 pt-4 px-4 border-t border-t border-white/[0.04]">
 <h3 className="text-[13px] leading-[1.3846] tracking-[-0.006em] text-fg-secondary mb-3 flex items-center gap-2 px-1 uppercase tracking-wide">
 <Users size={14} className="text-accent-primary" strokeWidth={2.2} />
 {t("team.title")}
 </h3>
 <div className="space-y-3">
 <CollaboratorManager
 projectId={selectedProjectId}
 currentCollaborators={(projectDetails.collaborators?.map((c) => ({
 user: {
 id: c.collaboratorId,
 name: c.collaborator?.name ?? null,
 email: c.collaborator?.email ??"",
 image: c.collaborator?.image ?? null,
 },
 permission: c.permission,
 })) ?? []) as Collaborator[]}
 onAddCollaborator={handleAddCollaborator}
 onRemoveCollaborator={handleRemoveCollaborator}
 onUpdatePermission={handleUpdatePermission}
 isOwner={isOwner}
 />
 </div>
 </div>
 )}

 {/* Add Task Section */}
 {hasWriteAccess && (
 <div className="mt-4 pt-4 px-4">
 <div className="space-y-4">
 <h3 className="text-[13px] leading-[1.3846] tracking-[-0.006em] text-fg-secondary mb-2 pl-1 uppercase tracking-wide flex items-center gap-2">
 <Plus size={14} className="text-accent-primary" strokeWidth={2.2} />
 {t("taskForm.add")}
 </h3>

 {/* AI Task Planner (A2) */}
 <AiTaskPlannerPanel
 projectId={selectedProjectId}
 orgId={projectDetails.organizationId ?? undefined}
 onApplied={() => {
 void utils.project.getById.invalidate({ id: selectedProjectId });
 }}
 />


 <CreateTaskForm
 projectId={selectedProjectId}
 onSubmit={handleCreateTask}
 availableUsers={availableUsers}
 />
 </div>
 </div>
 )}

 {/* Bottom spacing */}
 <div className="h-4" />
 </div>
 </div>
 )}
 </div>

 {/* Main Content Area */}
 <div className="flex-1 min-w-0">
 {selectedProjectId && projectDetails && (
 <div className="h-full">
 <InteractiveTimeline
 tasks={projectDetails.tasks as Task[]}
 onTaskStatusChange={handleTaskStatusChange}
 onTaskUpdate={handleTaskUpdate}
 onTaskCompletionNoteSave={handleTaskCompletionNoteSave}
 onTaskDiscard={handleTaskDiscard}
 canEditCompletionNote={(task) => {
 const completerId = task.completedBy?.id ?? null;
 return completerId === userId || isOwner;
 }}
 canDiscardTask={() => isOwner}
 availableUsers={availableUsers}
 isReadOnly={!hasWriteAccess}
 projectTitle={projectDetails.title}
 />
 </div>
 )}

 {!selectedProjectId && (
 <div className="h-[320px] flex flex-col items-center justify-center">
 <div className="w-[60px] h-[60px] rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
 <Folder size={26} className="text-fg-secondary" strokeWidth={2.2} />
 </div>
 <div className="text-center max-w-md px-8">
 <h3 className="text-[17px] font-[590] text-fg-primary mb-2">
 {t("projects.selectProject")}
 </h3>
 <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] text-fg-tertiary">
 {t("projects.selectProjectDesc")}
 </p>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Bottom Spacing */}
 <div className="h-8" />
 </div>
 </div>
 );
}