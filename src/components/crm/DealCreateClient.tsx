"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "~/trpc/react";

export function DealCreateClient() {
  const router = useRouter();
  const utils = api.useUtils();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [accountId, setAccountId] = useState<string>("");

  const activeOrgQuery = api.organization.getActive.useQuery(undefined, {
    retry: false,
  });

  const organizationId = activeOrgQuery.data?.organization?.id;

  const accountsQuery = api.crm.accounts.list.useQuery(
    { organizationId: organizationId ?? -1, limit: 100 },
    { enabled: typeof organizationId === "number" && organizationId > 0 }
  );

  const accountOptions = useMemo(() => accountsQuery.data?.items ?? [], [accountsQuery.data]);

  const createMutation = api.crm.deals.create.useMutation({
    onSuccess: async (created) => {
      if (organizationId) {
        await utils.crm.deals.list.invalidate({ organizationId, limit: 50 });
      }
      router.push(`/crm/deals/${created.id}`);
      router.refresh();
    },
  });

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

  return (
    <div className="rounded-xl border border-border-medium bg-bg-secondary p-6">
      <div className="text-lg font-semibold text-fg-primary">Create deal</div>
      <div className="mt-1 text-sm text-fg-secondary">Minimal MVP form (account + name required).</div>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (createMutation.isPending) return;

          const parsedAccountId = Number(accountId);
          const parsedAmount = amount.trim().length ? Number(amount) : undefined;

          createMutation.mutate({
            organizationId,
            accountId: parsedAccountId,
            name: name.trim(),
            amount: parsedAmount,
            closeDate: closeDate.trim().length ? closeDate.trim() : undefined,
          });
        }}
      >
        <label className="block">
          <div className="text-xs font-medium text-fg-secondary">Account *</div>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
            required
          >
            <option value="" disabled>
              {accountsQuery.isLoading ? "Loading accounts…" : "Select an account"}
            </option>
            {accountOptions.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>
          {accountsQuery.error ? (
            <div className="mt-1 text-xs text-red-200">Failed to load accounts: {accountsQuery.error.message}</div>
          ) : null}
        </label>

        <label className="block">
          <div className="text-xs font-medium text-fg-secondary">Name *</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
            placeholder="Q2 expansion"
            required
            minLength={1}
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-fg-secondary">Amount</div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
            inputMode="decimal"
            placeholder="12000"
          />
          <div className="mt-1 text-xs text-fg-secondary">Stored as numeric(12,2) on the server.</div>
        </label>

        <label className="block">
          <div className="text-xs font-medium text-fg-secondary">Close date</div>
          <input
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
            placeholder="2026-04-30"
          />
          <div className="mt-1 text-xs text-fg-secondary">MVP: accepts ISO date string (server validates).</div>
        </label>

        {createMutation.error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            Failed to create deal: {createMutation.error.message}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={
              createMutation.isPending ||
              name.trim().length === 0 ||
              accountId.trim().length === 0 ||
              !Number.isFinite(Number(accountId))
            }
            className="text-sm px-4 py-2 rounded-lg bg-accent-primary text-white disabled:opacity-60"
          >
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>

          <button
            type="button"
            className="text-sm px-4 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary"
            onClick={() => router.push("/crm/deals")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
