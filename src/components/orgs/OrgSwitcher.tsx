"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export function OrgSwitcher() {
  const tOrg = useTranslations("org");

  const utils = api.useUtils();
  const activeQuery = api.organization.getActive.useQuery();
  const orgsQuery = api.organization.listMine.useQuery();

  const [open, setOpen] = useState(false);

  const activeOrgId = activeQuery.data?.organization?.id ?? null;
  const activeName = activeQuery.data?.organization?.name ?? null;

  const items = orgsQuery.data ?? [];

  const setActive = api.organization.setActive.useMutation({
    onSuccess: async () => {
      await utils.organization.getActive.invalidate();
      await utils.organization.listMine.invalidate();
      await utils.user.getProfile.invalidate();
      setOpen(false);
    },
  });

  const handlePick = useCallback(
    (organizationId: number) => {
      if (setActive.isPending) return;
      setActive.mutate({ organizationId });
    },
    [setActive],
  );

  if (!items.length) return null;

  return (
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 inline-flex items-center gap-2 rounded-xl bg-bg-surface shadow-sm px-3 text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated hover:shadow-md transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="max-w-[180px] truncate">
          {activeName ?? tOrg("yourOrgs")}
        </span>
        <ChevronDown size={16} className="text-fg-tertiary" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl ios-card-elevated bg-bg-surface/95 backdrop-blur shadow-lg"
        >
          <div className="px-3 py-2 text-xs font-medium text-fg-tertiary border-b border-border-light/30">
            {tOrg("switchOrg")}
          </div>

          <div className="max-h-72 overflow-auto">
            {items.map((org) => {
              const isActive = activeOrgId === org.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handlePick(org.id)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 transition-colors ${
                    isActive
                      ? "bg-accent-primary/10 text-fg-primary"
                      : "hover:bg-bg-elevated text-fg-secondary"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{org.name}</div>
                    <div className="text-xs text-fg-tertiary">
                      {isActive ? tOrg("active") : tOrg("setActive")}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-mono tracking-[0.15em] text-fg-tertiary">
                    {org.accessCode}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-border-light/30">
            <Link
              href="/orgs"
              className="text-sm text-accent-primary hover:text-accent-hover transition-colors"
              onClick={() => setOpen(false)}
            >
              {tOrg("viewAll")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
