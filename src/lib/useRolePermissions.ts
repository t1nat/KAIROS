"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import { getPermissions, type RolePermissions, type OrgRole } from "~/lib/permissions";

/**
 * Client-side hook that returns the current user's role and permissions
 * within the active organization. Returns full write permissions when
 * in personal mode (no org) or when profile is still loading.
 */
export function useRolePermissions(): {
  role: OrgRole | null;
  permissions: RolePermissions;
  isLoading: boolean;
} {
  const { data: profile, isLoading } = api.user.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const role = (profile?.role as OrgRole | null) ?? null;

  const permissions = useMemo(() => {
    // Personal mode or no org → full permissions
    if (!profile?.organization || profile.usageMode === "personal") {
      return getPermissions("admin");
    }
    return getPermissions(role);
  }, [profile, role]);

  return { role, permissions, isLoading };
}
