"use client";

import { useMemo } from "react";
import Link from "next/link";

import { api } from "~/trpc/react";

export function DealsListClient() {
  const utils = api.useUtils();

  const activeOrgQuery = api.organization.getActive.useQuery(undefined, {
    retry: false,
  });

  const organizationId = activeOrgQuery.data?.organization?.id;

  const dealsQuery = api.crm.deals.list.useQuery(
    { organizationId: organizationId ?? -1, limit: 50 },
    { enabled: typeof organizationId === "number" && organizationId > 0 }
  );

  const items = useMemo(() => dealsQuery.data?.items ?? [], [dealsQuery.data]);

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

  if (dealsQuery.isLoading) {
    return <div className="text-sm text-fg-secondary">Loading deals…</div>;
  }

  if (dealsQuery.error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Failed to load deals: {dealsQuery.error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-fg-secondary">Showing {items.length} deals</div>
          <div className="mt-1 text-xs text-fg-secondary">
            Next: create/update + stage UI (pipeline).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/crm/deals/new"
            className="text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary hover:bg-bg-secondary transition-colors"
          >
            New deal
          </Link>

          <button
            type="button"
            className="text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary hover:bg-bg-secondary transition-colors"
            onClick={async () => {
              await utils.crm.deals.list.invalidate({ organizationId, limit: 50 });
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border-medium bg-bg-secondary overflow-hidden">
        <div className="divide-y divide-border-medium">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-fg-secondary">No deals yet.</div>
          ) : (
            items.map((d: any) => (
              <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-fg-primary">{d.name}</div>
                  <div className="text-xs text-fg-secondary">
                    Amount: {d.amount ?? "—"} · Close: {d.closeDate ?? "—"}
                  </div>
                </div>
                <Link
                  href={`/crm/deals/${d.id}`}
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
