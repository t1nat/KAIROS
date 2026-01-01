"use client";

import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

function roleLabel(role: string, tOrg: (key: string) => string) {
  if (role === "admin") return tOrg("roleAdmin");
  if (role === "mentor") return tOrg("roleMentor");
  return tOrg("roleWorker");
}

export function OrgDashboardClient() {
  const tOrg = useTranslations("org");
  const tCommon = useTranslations("common");

  const utils = api.useUtils();
  const activeQuery = api.organization.getActive.useQuery();
  const orgsQuery = api.organization.listMine.useQuery();

  const setActive = api.organization.setActive.useMutation({
    onSuccess: async () => {
      await utils.organization.getActive.invalidate();
      await utils.organization.listMine.invalidate();
      await utils.user.getProfile.invalidate();
    },
  });

  const activeOrgId = activeQuery.data?.organization?.id ?? null;
  const items = orgsQuery.data ?? [];

  if (orgsQuery.isLoading) {
    return (
      <div className="surface-card p-6">
        <div className="text-sm text-fg-secondary">{tCommon("loading")}</div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="surface-card p-6">
        <div className="text-sm text-fg-secondary">{tOrg("noOrgs")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card p-6">
        <h1 className="text-2xl font-bold text-fg-primary">{tOrg("yourOrgs")}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{tOrg("activeOrgHint")}</p>
      </div>

      <div className="grid gap-4">
        {items.map((org) => {
          const isActive = org.id === activeOrgId;
          return (
            <div
              key={org.id}
              className={`surface-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                isActive ? "border border-accent-primary/30" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold text-fg-primary truncate">{org.name}</div>
                  {isActive ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                      {tOrg("active")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-fg-secondary">
                  {tOrg("roleLabel")}: {roleLabel(org.role, tOrg)}
                </div>
                <div className="mt-2 text-xs text-fg-tertiary">
                  {tOrg("accessCode")}: {" "}
                  <span className="font-mono tracking-[0.2em]">{org.accessCode}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActive.mutate({ organizationId: org.id })}
                  disabled={setActive.isPending || isActive}
                  className="px-4 py-2 rounded-xl bg-bg-surface border border-border-light/30 text-sm text-fg-primary hover:bg-bg-elevated transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActive ? tOrg("active") : tOrg("setActive")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
