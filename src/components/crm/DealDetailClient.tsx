"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

export function DealDetailClient({ dealId }: { dealId: number }) {
  const activeOrgQuery = api.organization.getActive.useQuery(undefined, {
    retry: false,
  });

  const organizationId = activeOrgQuery.data?.organization?.id;

  const dealQuery = api.crm.deals.getById.useQuery(
    { organizationId: organizationId ?? -1, id: dealId },
    { enabled: typeof organizationId === "number" && organizationId > 0 }
  );

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

  if (dealQuery.isLoading) {
    return <div className="text-sm text-fg-secondary">Loading deal…</div>;
  }

  if (dealQuery.error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Failed to load deal: {dealQuery.error.message}
      </div>
    );
  }

  const d = dealQuery.data;
  if (!d) {
    return (
      <div className="rounded-xl border border-border-medium bg-bg-secondary p-4 text-sm text-fg-secondary">
        Deal not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border-medium bg-bg-secondary p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-fg-primary">{d.name}</div>
            <div className="mt-1 text-sm text-fg-secondary">
              Amount: {d.amount ?? "—"} · Close: {d.closeDate ?? "—"}
            </div>
          </div>
          <Link
            href="/crm/deals"
            className="text-xs text-fg-secondary hover:text-fg-primary underline underline-offset-4"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border-medium bg-bg-secondary p-6">
        <div className="text-sm font-semibold text-fg-primary">Next</div>
        <div className="mt-2 text-sm text-fg-secondary">
          Edit form + stage UI + timeline come next.
        </div>
      </div>
    </div>
  );
}
