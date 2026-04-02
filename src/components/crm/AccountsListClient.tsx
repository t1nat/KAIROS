"use client";

import { useMemo } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export function AccountsListClient() {
  const utils = api.useUtils();

  const activeOrgQuery = api.organization.getActive.useQuery(undefined, {
    retry: false,
  });

  const organizationId = activeOrgQuery.data?.organization?.id;

  const accountsQuery = api.crm.accounts.list.useQuery(
    { organizationId: organizationId ?? -1, limit: 50 },
    { enabled: typeof organizationId === "number" && organizationId > 0 }
  );

  const items = useMemo(() => accountsQuery.data?.items ?? [], [accountsQuery.data]);

  if (activeOrgQuery.isLoading) {
    return <div className="text-sm text-fg-secondary">Loading organization…</div>;
  }

  if (!organizationId) {
    return (
      <div className="rounded-xl border border-border-medium bg-bg-secondary p-4 text-sm text-fg-secondary">
        Select an organization to use CRM.
      </div>
    );
  }

  if (accountsQuery.isLoading) {
    return <div className="text-sm text-fg-secondary">Loading accounts…</div>;
  }

  if (accountsQuery.error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Failed to load accounts: {accountsQuery.error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-fg-secondary">Showing {items.length} accounts</div>
          <div className="mt-1 text-xs text-fg-secondary">Create/update comes next (MVP CRUD).</div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/crm/accounts/new"
            className="text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary hover:bg-bg-secondary transition-colors"
          >
            New account
          </Link>

          <button
            type="button"
            className="text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary hover:bg-bg-secondary transition-colors"
            onClick={async () => {
              await utils.crm.accounts.list.invalidate({ organizationId, limit: 50 });
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border-medium bg-bg-secondary overflow-hidden">
        <div className="divide-y divide-border-medium">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-fg-secondary">No accounts yet.</div>
          ) : (
            items.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-fg-primary">{a.name}</div>
                  <div className="text-xs text-fg-secondary">{a.domain ?? "—"}</div>
                </div>
                <Link
                  href={`/crm/accounts/${a.id}`}
                  className="text-xs text-fg-secondary hover:text-fg-primary underline underline-offset-4"
                >
                  View
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
