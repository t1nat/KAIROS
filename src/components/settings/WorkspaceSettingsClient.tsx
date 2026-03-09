"use client";

import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Plus,
  Users,
  Shield,
  Mail,
  Copy,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  UserPlus,
  X,
  Check,
} from "lucide-react";
import { api } from "~/trpc/react";
import { useToast } from "~/components/providers/ToastProvider";

// ---------------------------------------------------------------------------
// Permission labels
// ---------------------------------------------------------------------------
const PERMISSION_KEYS = [
  "canCreateProjects",
  "canEditProjects",
  "canAssignTasks",
  "canDeleteTasks",
  "canAddMembers",
  "canKickMembers",
  "canManageRoles",
  "canViewAnalytics",
] as const;

type PermissionKey = (typeof PERMISSION_KEYS)[number];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  canCreateProjects: "Create projects",
  canEditProjects: "Edit projects",
  canAssignTasks: "Assign tasks",
  canDeleteTasks: "Delete tasks",
  canAddMembers: "Invite members",
  canKickMembers: "Remove members",
  canManageRoles: "Manage roles",
  canViewAnalytics: "View analytics",
};

// ---------------------------------------------------------------------------
// Template role defaults (shown in the roles section as read-only templates)
// ---------------------------------------------------------------------------
const TEMPLATE_ROLES: Record<string, Record<PermissionKey, boolean>> = {
  Admin: {
    canCreateProjects: true,
    canEditProjects: true,
    canAssignTasks: true,
    canDeleteTasks: true,
    canAddMembers: true,
    canKickMembers: true,
    canManageRoles: true,
    canViewAnalytics: true,
  },
  Member: {
    canCreateProjects: true,
    canEditProjects: true,
    canAssignTasks: true,
    canDeleteTasks: false,
    canAddMembers: false,
    canKickMembers: false,
    canManageRoles: false,
    canViewAnalytics: true,
  },
  Guest: {
    canCreateProjects: false,
    canEditProjects: false,
    canAssignTasks: false,
    canDeleteTasks: false,
    canAddMembers: false,
    canKickMembers: false,
    canManageRoles: false,
    canViewAnalytics: false,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WorkspaceSettingsClient() {
  const toast = useToast();
  const utils = api.useUtils();

  // ---- Organization state ----
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showJoinOrg, setShowJoinOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // ---- Invite state ----
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [emailLookupDebouncedEmail, setEmailLookupDebouncedEmail] = useState("");

  // ---- Custom role creation state ----
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<Record<PermissionKey, boolean>>(
    Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>,
  );
  const [pendingRoles, setPendingRoles] = useState<Array<{ id: number; name: string } & Record<PermissionKey, boolean>>>([]);

  // ---- Expand/collapse sections ----
  const [expandedSection, setExpandedSection] = useState<string | null>("org");

  // ---- Email lookup debounce ----
  const inviteEmailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (inviteEmailTimerRef.current) clearTimeout(inviteEmailTimerRef.current);
    const trimmed = inviteEmail.trim();
    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      inviteEmailTimerRef.current = setTimeout(() => setEmailLookupDebouncedEmail(trimmed), 400);
    } else {
      setEmailLookupDebouncedEmail("");
    }
    return () => { if (inviteEmailTimerRef.current) clearTimeout(inviteEmailTimerRef.current); };
  }, [inviteEmail]);

  // ---- Queries ----
  const { data: profile } = api.user.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: myOrgs } = api.organization.listMine.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: activeOrg } = api.organization.getActive.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const activeOrgId = activeOrg?.organization?.id;

  const { data: members } = api.organization.getMembers.useQuery(
    { organizationId: activeOrgId! },
    { enabled: !!activeOrgId, retry: false, refetchOnWindowFocus: false },
  );
  const { data: roles } = api.organization.getRoles.useQuery(
    { organizationId: activeOrgId! },
    { enabled: !!activeOrgId, retry: false, refetchOnWindowFocus: false },
  );
  const { data: invites } = api.organization.getInvites.useQuery(
    { organizationId: activeOrgId! },
    { enabled: !!activeOrgId && activeOrg?.role === "admin", retry: false, refetchOnWindowFocus: false },
  );
  const { data: inviteEmailLookup, isFetching: isLookingUpEmail } = api.user.searchByEmail.useQuery(
    { email: emailLookupDebouncedEmail },
    { enabled: !!emailLookupDebouncedEmail, retry: false, refetchOnWindowFocus: false },
  );

  // ---- Mutations ----
  const createOrg = api.organization.create.useMutation({
    onSuccess: () => {
      toast.success("Organization created");
      setOrgName("");
      setShowCreateOrg(false);
      void utils.organization.listMine.invalidate();
      void utils.organization.getActive.invalidate();
      void utils.user.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const joinOrg = api.organization.join.useMutation({
    onSuccess: (data) => {
      toast.success(`Joined ${data.organizationName}`);
      setJoinCode("");
      setShowJoinOrg(false);
      void utils.organization.listMine.invalidate();
      void utils.organization.getActive.invalidate();
      void utils.user.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setActiveOrg = api.organization.setActive.useMutation({
    onSuccess: () => {
      toast.success("Switched organization");
      void utils.organization.getActive.invalidate();
      void utils.organization.getMembers.invalidate();
      void utils.organization.getRoles.invalidate();
      void utils.organization.getInvites.invalidate();
      void utils.user.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const leaveOrg = api.organization.leave.useMutation({
    onSuccess: () => {
      toast.success("Left organization");
      void utils.organization.listMine.invalidate();
      void utils.organization.getActive.invalidate();
      void utils.user.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMemberRole = api.organization.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      void utils.organization.getMembers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = api.organization.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      void utils.organization.getMembers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const inviteMember = api.organization.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("Invite sent");
      setInviteEmail("");
      void utils.organization.getInvites.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelInvite = api.organization.cancelInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite cancelled");
      void utils.organization.getInvites.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createRole = api.organization.createRole.useMutation();

  const deleteRole = api.organization.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("Role deleted");
      void utils.organization.getRoles.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ---- Helpers ----
  const isAdmin = activeOrg?.role === "admin";
  const isPersonal = profile?.usageMode === "personal";

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Access code copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* ------------------------------------------------------------------ */}
      {/* Organization Section                                                */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <button
          onClick={() => toggleSection("org")}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-left hover:bg-white/[0.04] transition border border-transparent hover:border-white/[0.08]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-primary/15 flex items-center justify-center">
              <Building2 size={18} className="text-accent-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg-primary">Organizations</h2>
              <p className="text-xs text-fg-tertiary">Manage your organizations and teams</p>
            </div>
          </div>
          {expandedSection === "org" ? (
            <ChevronUp size={18} className="text-fg-tertiary" />
          ) : (
            <ChevronDown size={18} className="text-fg-tertiary" />
          )}
        </button>

        {expandedSection === "org" && (
          <div className="mt-3 space-y-4">
            {/* Current organizations list */}
            {myOrgs && myOrgs.length > 0 && (
              <div className="space-y-2">
                {myOrgs.map((org) => (
                  <div
                    key={org.id}
                    className={`p-4 rounded-xl border transition-all ${
                      activeOrgId === org.id
                        ? "border-accent-primary/30 bg-accent-primary/5"
                        : "border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
                          <Building2 size={18} className="text-fg-tertiary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-fg-primary">{org.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-fg-tertiary capitalize">{org.role}</span>
                            {activeOrgId === org.id && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-medium">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyCode(org.accessCode)}
                          className="p-2 rounded-lg hover:bg-bg-tertiary text-fg-tertiary hover:text-fg-secondary transition"
                          title="Copy access code"
                        >
                          <Copy size={14} />
                        </button>
                        {activeOrgId !== org.id && (
                          <button
                            onClick={() => setActiveOrg.mutate({ organizationId: org.id })}
                            disabled={setActiveOrg.isPending}
                            className="px-3 py-1.5 text-xs rounded-lg bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25 transition font-medium"
                          >
                            Switch
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to leave this organization?")) {
                              leaveOrg.mutate({ organizationId: org.id });
                            }
                          }}
                          disabled={leaveOrg.isPending}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-fg-tertiary hover:text-red-400 transition"
                          title="Leave organization"
                        >
                          <LogOut size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No org message */}
            {(!myOrgs || myOrgs.length === 0) && isPersonal && (
              <div className="p-6 rounded-xl border border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04] text-center">
                <Building2 size={32} className="text-fg-tertiary mx-auto mb-3" />
                <p className="text-sm text-fg-secondary mb-1">No organizations yet</p>
                <p className="text-xs text-fg-tertiary">Create or join an organization to collaborate with your team</p>
              </div>
            )}

            {/* Create / Join buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateOrg(true);
                  setShowJoinOrg(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl kairos-neon-btn text-white text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Create Organization
              </button>
              <button
                onClick={() => {
                  setShowJoinOrg(true);
                  setShowCreateOrg(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04] hover:bg-bg-elevated text-fg-primary text-sm font-medium flex items-center justify-center gap-2 transition"
              >
                <UserPlus size={16} />
                Join Organization
              </button>
            </div>

            {/* Create org form */}
            {showCreateOrg && (
              <div className="p-4 rounded-xl border border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04] space-y-3">
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="w-full px-4 py-2.5 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && orgName.trim()) createOrg.mutate({ name: orgName });
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => createOrg.mutate({ name: orgName })}
                    disabled={!orgName.trim() || createOrg.isPending}
                    className="flex-1 px-4 py-2 rounded-lg kairos-neon-btn text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createOrg.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateOrg(false)}
                    className="px-4 py-2 rounded-lg border border-white/[0.06] text-fg-secondary text-sm hover:bg-bg-elevated transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Join org form */}
            {showJoinOrg && (
              <div className="p-4 rounded-xl border border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04] space-y-3">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter access code (e.g. XXXX-XXXX-XXXX)"
                  className="w-full px-4 py-2.5 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30 font-mono tracking-wider"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && joinCode.trim()) joinOrg.mutate({ code: joinCode });
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => joinOrg.mutate({ code: joinCode })}
                    disabled={!joinCode.trim() || joinOrg.isPending}
                    className="flex-1 px-4 py-2 rounded-lg kairos-neon-btn text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {joinOrg.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Join
                  </button>
                  <button
                    onClick={() => setShowJoinOrg(false)}
                    className="px-4 py-2 rounded-lg border border-white/[0.06] text-fg-secondary text-sm hover:bg-bg-elevated transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Members Section (only when in an org)                               */}
      {/* ------------------------------------------------------------------ */}
      {activeOrgId && (
        <section>
          <button
            onClick={() => toggleSection("members")}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-left hover:bg-white/[0.04] transition border border-transparent hover:border-white/[0.08]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Users size={18} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-fg-primary">Members</h2>
                <p className="text-xs text-fg-tertiary">
                  {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {expandedSection === "members" ? (
              <ChevronUp size={18} className="text-fg-tertiary" />
            ) : (
              <ChevronDown size={18} className="text-fg-tertiary" />
            )}
          </button>

          {expandedSection === "members" && (
            <div className="mt-3 space-y-3">
              {/* Invite form (admin only) */}
              {isAdmin && (
                <div className="p-4 rounded-xl border border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04]">
                  <h3 className="text-sm font-medium text-fg-primary mb-3 flex items-center gap-2">
                    <Mail size={14} className="text-accent-primary" />
                    Invite Member
                  </h3>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full px-3 py-2 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && inviteEmail.trim() && activeOrgId) {
                            inviteMember.mutate({
                              organizationId: activeOrgId,
                              email: inviteEmail,
                              role: inviteRole,
                            });
                          }
                        }}
                      />
                      {emailLookupDebouncedEmail && !isLookingUpEmail && inviteEmailLookup && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-10 p-2.5 rounded-lg border border-accent-primary/20 bg-bg-elevated shadow-lg flex items-center gap-2.5">
                          {inviteEmailLookup.image ? (
                            <img src={inviteEmailLookup.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-accent-primary/15 flex items-center justify-center">
                              <span className="text-xs font-bold text-accent-primary">
                                {(inviteEmailLookup.name ?? inviteEmailLookup.email)?.[0]?.toUpperCase() ?? "?"}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-fg-primary truncate">{inviteEmailLookup.name ?? "No name"}</p>
                            <p className="text-[10px] text-fg-tertiary truncate">{inviteEmailLookup.email}</p>
                          </div>
                        </div>
                      )}
                      {emailLookupDebouncedEmail && !isLookingUpEmail && !inviteEmailLookup && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-10 p-2.5 rounded-lg border border-amber-500/20 bg-bg-elevated shadow-lg">
                          <p className="text-xs text-amber-400">No existing account — invite will be sent anyway</p>
                        </div>
                      )}
                      {emailLookupDebouncedEmail && isLookingUpEmail && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-10 p-2.5 rounded-lg border border-white/[0.06] bg-bg-elevated shadow-lg flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin text-fg-tertiary" />
                          <p className="text-xs text-fg-tertiary">Looking up email...</p>
                        </div>
                      )}
                    </div>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="px-3 py-2 bg-bg-primary rounded-lg text-sm text-fg-primary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="guest">Guest</option>
                      {roles && roles.length > 0 && (
                        <option disabled>──────────</option>
                      )}
                      {roles?.map((role) => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (inviteEmail.trim() && activeOrgId) {
                          inviteMember.mutate({
                            organizationId: activeOrgId,
                            email: inviteEmail,
                            role: inviteRole,
                          });
                        }
                      }}
                      disabled={!inviteEmail.trim() || inviteMember.isPending}
                      className="px-4 py-2 rounded-lg kairos-neon-btn text-white text-sm font-medium disabled:opacity-50"
                    >
                      {inviteMember.isPending ? <Loader2 size={14} className="animate-spin" /> : "Invite"}
                    </button>
                  </div>
                </div>
              )}

              {/* Pending invites */}
              {isAdmin && invites && invites.length > 0 && (
                <div className="p-4 rounded-xl border border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04]">
                  <h3 className="text-sm font-medium text-fg-primary mb-3">Pending Invites</h3>
                  <div className="space-y-2">
                    {invites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-primary/50"
                      >
                        <div className="flex items-center gap-3">
                          <Mail size={14} className="text-fg-tertiary" />
                          <span className="text-sm text-fg-secondary">{inv.email}</span>
                          <span className="text-xs text-fg-tertiary capitalize px-1.5 py-0.5 rounded bg-bg-tertiary">
                            {inv.displayRole ?? inv.role}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            cancelInvite.mutate({ organizationId: activeOrgId!, inviteId: inv.id })
                          }
                          disabled={cancelInvite.isPending}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-fg-tertiary hover:text-red-400 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members list */}
              <div className="space-y-2">
                {members?.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl border border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-bg-secondary flex items-center justify-center">
                          <span className="text-xs font-medium text-fg-tertiary">
                            {(member.name ?? member.email)?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-fg-primary">
                          {member.name ?? member.email}
                        </p>
                        <p className="text-xs text-fg-tertiary">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <select
                          value={member.role}
                          onChange={(e) => {
                            updateMemberRole.mutate({
                              organizationId: activeOrgId!,
                              userId: member.id,
                              role: e.target.value as "admin" | "member" | "guest",
                            });
                          }}
                          disabled={updateMemberRole.isPending}
                          className="px-2 py-1 bg-bg-primary rounded-lg text-xs text-fg-secondary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="guest">Guest</option>
                          {roles && roles.length > 0 && (
                            <option disabled>──────────</option>
                          )}
                          {roles?.map((role) => (
                            <option key={role.id} value={role.name}>{role.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-fg-tertiary capitalize px-2 py-1 rounded-lg bg-bg-tertiary">
                          {member.role}
                        </span>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${member.name ?? member.email} from the organization?`)) {
                              removeMember.mutate({
                                organizationId: activeOrgId!,
                                userId: member.id,
                              });
                            }
                          }}
                          disabled={removeMember.isPending}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-fg-tertiary hover:text-red-400 transition"
                          title="Remove member"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Roles Section (only when in an org)                                 */}
      {/* ------------------------------------------------------------------ */}
      {activeOrgId && (
        <section>
          <button
            onClick={() => toggleSection("roles")}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-left hover:bg-white/[0.04] transition border border-transparent hover:border-white/[0.08]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Shield size={18} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-fg-primary">Roles & Permissions</h2>
                <p className="text-xs text-fg-tertiary">
                  Manage template and custom roles
                </p>
              </div>
            </div>
            {expandedSection === "roles" ? (
              <ChevronUp size={18} className="text-fg-tertiary" />
            ) : (
              <ChevronDown size={18} className="text-fg-tertiary" />
            )}
          </button>

          {expandedSection === "roles" && (
            <div className="mt-3 space-y-4">
              {/* New Role button */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-fg-tertiary uppercase tracking-wider">
                  All Roles
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setShowCreateRole(!showCreateRole)}
                    className="text-xs text-accent-primary hover:text-accent-secondary transition flex items-center gap-1"
                  >
                    <Plus size={12} />
                    New Role
                  </button>
                )}
              </div>

              {/* Create role form */}
              {showCreateRole && isAdmin && (
                <div className="p-4 rounded-xl border border-accent-primary/20 bg-bg-surface">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Role name"
                    className="w-full px-3 py-2 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30 mb-3"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {PERMISSION_KEYS.map((key) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-xs text-fg-secondary cursor-pointer hover:text-fg-primary transition"
                      >
                        <input
                          type="checkbox"
                          checked={newRolePerms[key]}
                          onChange={(e) =>
                            setNewRolePerms((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                            newRolePerms[key]
                              ? "bg-accent-primary/20 border-accent-primary/50"
                              : "bg-bg-tertiary border-white/[0.06]"
                          }`}
                        >
                          {newRolePerms[key] && <Check size={10} className="text-accent-primary" />}
                        </div>
                        {PERMISSION_LABELS[key]}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!newRoleName.trim() || !activeOrgId) return;
                        try {
                          const created = await createRole.mutateAsync({
                            organizationId: activeOrgId,
                            name: newRoleName,
                            ...newRolePerms,
                          });
                          if (created) {
                            setPendingRoles((prev) => [...prev, created as { id: number; name: string } & Record<PermissionKey, boolean>]);
                          }
                          toast.success("Role created");
                          setNewRoleName("");
                          setNewRolePerms(
                            Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>,
                          );
                          setShowCreateRole(false);
                          await utils.organization.getRoles.invalidate();
                          setPendingRoles([]);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to create role");
                        }
                      }}
                      disabled={!newRoleName.trim() || createRole.isPending}
                      className="flex-1 px-4 py-2 rounded-lg kairos-neon-btn text-white text-sm font-medium disabled:opacity-50"
                    >
                      {createRole.isPending ? <Loader2 size={14} className="animate-spin" /> : "Create Role"}
                    </button>
                    <button
                      onClick={() => setShowCreateRole(false)}
                      className="px-4 py-2 rounded-lg border border-white/[0.06] text-fg-secondary text-sm hover:bg-bg-elevated transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Template roles followed by custom roles in one unified list */}
              <div className="space-y-3">
                {Object.entries(TEMPLATE_ROLES).map(([name, perms]) => (
                  <div
                    key={name}
                    className="p-4 rounded-xl border border-white/[0.1] bg-white/[0.03] dark:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-fg-primary">{name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-tertiary text-fg-tertiary font-medium">
                        Template
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {PERMISSION_KEYS.map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-xs text-fg-secondary"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              perms[key]
                                ? "bg-accent-primary/20 border-accent-primary/50"
                                : "bg-bg-tertiary border-white/[0.06]"
                            }`}
                          >
                            {perms[key] && <Check size={10} className="text-accent-primary" />}
                          </div>
                          {PERMISSION_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {[...(roles ?? []), ...pendingRoles.filter((pr) => !(roles ?? []).some((r) => r.id === pr.id))].map((role) => (
                  <div
                    key={role.id}
                    className="p-4 rounded-xl border border-accent-primary/15 bg-accent-primary/[0.02] dark:bg-accent-primary/[0.03]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-fg-primary">{role.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary font-medium">
                          Custom
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete the role "${role.name}"?`)) {
                                deleteRole.mutate({
                                  organizationId: activeOrgId!,
                                  roleId: role.id,
                                });
                              }
                            }}
                            disabled={deleteRole.isPending}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-fg-tertiary hover:text-red-400 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {PERMISSION_KEYS.map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-xs text-fg-secondary"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              role[key]
                                ? "bg-accent-primary/20 border-accent-primary/50"
                                : "bg-bg-tertiary border-white/[0.06]"
                            }`}
                          >
                            {role[key] && <Check size={10} className="text-accent-primary" />}
                          </div>
                          {PERMISSION_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
