"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "~/trpc/react";

export function DealDetailClient({ dealId }: { dealId: number }) {
  const utils = api.useUtils();

  const activeOrgQuery = api.organization.getActive.useQuery(undefined, {
    retry: false,
  });

  const organizationId = activeOrgQuery.data?.organization?.id;

  const dealQuery = api.crm.deals.getById.useQuery(
    { organizationId: organizationId ?? -1, id: dealId },
    { enabled: typeof organizationId === "number" && organizationId > 0 }
  );

  const updateMutation = api.crm.deals.update.useMutation({
    onSuccess: async () => {
      if (!organizationId) return;
      await utils.crm.deals.getById.invalidate({ organizationId, id: dealId });
      await utils.crm.deals.list.invalidate({ organizationId, limit: 50 });
    },
  });

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const d = dealQuery.data;
    if (!d) return;
    setName(d.name ?? "");
    setAmount(d.amount ?? "");
    setCloseDate(d.closeDate ?? "");
  }, [dealQuery.data]);

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
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-fg-primary">Details</div>
          <button
            type="button"
            className="text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary hover:bg-bg-secondary transition-colors"
            onClick={() => {
              setIsEditing((v) => !v);
              if (!isEditing) {
                setName(d.name ?? "");
                setAmount(d.amount ?? "");
                setCloseDate(d.closeDate ?? "");
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
                id: dealId,
                patch: {
                  name: name.trim() ? name.trim() : undefined,
                  amount: amount.trim() ? amount.trim() : undefined,
                  closeDate: closeDate.trim() ? closeDate.trim() : null,
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
              <div className="text-xs font-medium text-fg-secondary">Amount</div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
                inputMode="decimal"
                placeholder="12000"
              />
              <div className="mt-1 text-xs text-fg-secondary">
                Stored as numeric(12,2) on the server.
              </div>
            </label>

            <label className="block">
              <div className="text-xs font-medium text-fg-secondary">Close date</div>
              <input
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
                placeholder="2026-04-30"
              />
              <div className="mt-1 text-xs text-fg-secondary">ISO date string (YYYY-MM-DD).</div>
            </label>

            {updateMutation.error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                Failed to update deal: {updateMutation.error.message}
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
                  setName(d.name ?? "");
                  setAmount(d.amount ?? "");
                  setCloseDate(d.closeDate ?? "");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 text-sm text-fg-secondary space-y-1">
            <div>Stage: {d.stageId ?? "—"}</div>
            <div>Pipeline: {d.pipelineId ?? "—"}</div>
            <div>Owner: {d.ownerUserId ?? "—"}</div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border-medium bg-bg-secondary p-6">
        <div className="text-sm font-semibold text-fg-primary">Next</div>
        <div className="mt-2 text-sm text-fg-secondary">
          Deal stage UI + stage-change logging + timeline come next.
        </div>
      </div>
    </div>
  );
}
