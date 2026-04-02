"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "~/trpc/react";

export function AccountDetailClient({ accountId }: { accountId: number }) {
  const utils = api.useUtils();

  const activeOrgQuery = api.organization.getActive.useQuery(undefined, {
    retry: false,
  });

  const organizationId = activeOrgQuery.data?.organization?.id;

  const accountQuery = api.crm.accounts.getById.useQuery(
    { organizationId: organizationId ?? -1, id: accountId },
    { enabled: typeof organizationId === "number" && organizationId > 0 }
  );

  const updateMutation = api.crm.accounts.update.useMutation({
    onSuccess: async () => {
      if (!organizationId) return;
      await utils.crm.accounts.getById.invalidate({ organizationId, id: accountId });
      await utils.crm.accounts.list.invalidate({ organizationId, limit: 50 });
    },
  });

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!accountQuery.data) return;
    setName(accountQuery.data.name ?? "");
    setDomain(accountQuery.data.domain ?? "");
    setIndustry(accountQuery.data.industry ?? "");
  }, [accountQuery.data]);

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
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-fg-primary">Details</div>
          <button
            type="button"
            className="text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary hover:bg-bg-secondary transition-colors"
            onClick={() => {
              setIsEditing((v) => !v);
              if (!isEditing) {
                setName(a.name ?? "");
                setDomain(a.domain ?? "");
                setIndustry(a.industry ?? "");
              }
            }}
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>

        {isEditing ? (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                organizationId,
                id: accountId,
                patch: {
                  name: name.trim() ? name.trim() : undefined,
                  domain: domain.trim() ? domain.trim() : null,
                  industry: industry.trim() ? industry.trim() : null,
                },
              });
            }}
          >
            <label className="block">
              <div className="text-xs font-medium text-fg-secondary">Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
              />
            </label>

            <label className="block">
              <div className="text-xs font-medium text-fg-secondary">Domain</div>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
              />
            </label>

            <label className="block">
              <div className="text-xs font-medium text-fg-secondary">Industry</div>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
              />
            </label>

            {updateMutation.error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                Failed to update account: {updateMutation.error.message}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="text-sm px-4 py-2 rounded-lg bg-accent-primary text-white disabled:opacity-60"
              >
                {updateMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="text-sm px-4 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary"
                onClick={() => {
                  setIsEditing(false);
                  setName(a.name ?? "");
                  setDomain(a.domain ?? "");
                  setIndustry(a.industry ?? "");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 text-sm text-fg-secondary space-y-1">
            <div>Industry: {a.industry ?? "—"}</div>
            <div>Owner: {a.ownerUserId ?? "—"}</div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border-medium bg-bg-secondary p-6">
        <div className="text-sm font-semibold text-fg-primary">Next</div>
        <div className="mt-2 text-sm text-fg-secondary">Timeline + linked deals/contacts come next.</div>
      </div>
    </div>
  );
}
