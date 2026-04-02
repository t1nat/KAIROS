"use client";

import Link from "next/link";

import { api } from "~/trpc/react";

export function AccountDetailClient({ accountId }: { accountId: number }) {
  const activeOrgQuery = api.organization.getActive.useQuery(undefined, {
    retry: false,
  });

  const organizationId = activeOrgQuery.data?.organization?.id;

  const accountQuery = api.crm.accounts.getById.useQuery(
    { organizationId: organizationId ?? -1, id: accountId },
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

  if (accountQuery.isLoading) {
    return <div className="text-sm text-fg-secondary">Loading account…</div>;
  }

  if (accountQuery.error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Failed to load account: {accountQuery.error.message}
      </div>
    );
  }

  const a = accountQuery.data;
  if (!a) {
    return (
      <div className="rounded-xl border border-border-medium bg-bg-secondary p-4 text-sm text-fg-secondary">
        Account not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border-medium bg-bg-secondary p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-fg-primary">{a.name}</div>
            <div className="mt-1 text-sm text-fg-secondary">{a.domain ?? "—"}</div>
          </div>
          <Link
            href="/crm/accounts"
            className="text-xs text-fg-secondary hover:text-fg-primary underline underline-offset-4"
          >
            Back to list
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border-medium bg-bg-secondary p-6">
        <div className="text-sm font-semibold text-fg-primary">Next</div>
        <div className="mt-2 text-sm text-fg-secondary">
          Edit form + timeline tab come next.
        </div>
      </div>
    </div>
  );
}
