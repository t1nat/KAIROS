/**
 * Role-based permission utilities for KAIROS.
 *
 * Roles:
 * - admin:  full read/write, manage members, manage org
 * - worker: full read/write on assigned tasks/projects, can create notes/events
 * - mentor: VIEW-ONLY — can browse all data but cannot create, update, or delete
 */

export type OrgRole = "admin" | "worker" | "mentor";

export interface RolePermissions {
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canCreateNotes: boolean;
  canEditNotes: boolean;
  canDeleteNotes: boolean;
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canManageMembers: boolean;
  canManageOrg: boolean;
  isViewOnly: boolean;
}

const ADMIN_PERMISSIONS: RolePermissions = {
  canCreateProjects: true,
  canEditProjects: true,
  canDeleteProjects: true,
  canCreateTasks: true,
  canEditTasks: true,
  canDeleteTasks: true,
  canCreateNotes: true,
  canEditNotes: true,
  canDeleteNotes: true,
  canCreateEvents: true,
  canEditEvents: true,
  canDeleteEvents: true,
  canManageMembers: true,
  canManageOrg: true,
  isViewOnly: false,
};

const WORKER_PERMISSIONS: RolePermissions = {
  canCreateProjects: true,
  canEditProjects: true,
  canDeleteProjects: false,
  canCreateTasks: true,
  canEditTasks: true,
  canDeleteTasks: true,
  canCreateNotes: true,
  canEditNotes: true,
  canDeleteNotes: true,
  canCreateEvents: true,
  canEditEvents: true,
  canDeleteEvents: false,
  canManageMembers: false,
  canManageOrg: false,
  isViewOnly: false,
};

const MENTOR_PERMISSIONS: RolePermissions = {
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canCreateTasks: false,
  canEditTasks: false,
  canDeleteTasks: false,
  canCreateNotes: false,
  canEditNotes: false,
  canDeleteNotes: false,
  canCreateEvents: false,
  canEditEvents: false,
  canDeleteEvents: false,
  canManageMembers: false,
  canManageOrg: false,
  isViewOnly: true,
};

/**
 * Get the full permissions object for a given role.
 * Falls back to worker (most restrictive non-view) if unknown.
 */
export function getPermissions(role: OrgRole | null | undefined): RolePermissions {
  switch (role) {
    case "admin":
      return ADMIN_PERMISSIONS;
    case "mentor":
      return MENTOR_PERMISSIONS;
    case "worker":
    default:
      return WORKER_PERMISSIONS;
  }
}

/**
 * Returns true if the given role is view-only (cannot write).
 */
export function isViewOnlyRole(role: OrgRole | null | undefined): boolean {
  return role === "mentor";
}
