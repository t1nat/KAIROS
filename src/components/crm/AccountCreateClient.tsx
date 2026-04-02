"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "~/trpc/react";

export function AccountCreateClient() {
  const router = useRouter();
  const utils = api.useUtils();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");

  const activeOrgQuery = api.organization.getActive.useQuery(undefined, {
    retry: false,
  });

  const organizationId = activeOrgQuery.data?.organization?.id;

  const createMutation = api.crm.accounts.create.useMutation({
    onSuccess: async (created) => {
      if (organizationId) {
        await utils.crm.accounts.list.invalidate({ organizationId, limit: 50 });
      }
      router.push(`/crm/accounts/${created.id}`);
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
      <div className="text-lg font-semibold text-fg-primary">Create account</div>
      <div className="mt-1 text-sm text-fg-secondary">Minimal MVP form (name required).</div>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (createMutation.isPending) return;
          createMutation.mutate({
            organizationId,
            name: name.trim(),
            domain: domain.trim() ? domain.trim() : undefined,
            industry: industry.trim() ? industry.trim() : undefined,
          });
        }}
      >
        <label className="block">
          <div className="text-xs font-medium text-fg-secondary">Name *</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
            placeholder="Acme Inc"
            required
            minLength={1}
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-fg-secondary">Domain</div>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
            placeholder="acme.com"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-fg-secondary">Industry</div>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg-primary border border-border-medium px-3 py-2 text-sm text-fg-primary"
            placeholder="SaaS"
          />
        </label>

        {createMutation.error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            Failed to create account: {createMutation.error.message}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending || name.trim().length === 0}
            className="text-sm px-4 py-2 rounded-lg bg-accent-primary text-white disabled:opacity-60"
          >
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>

          <button
            type="button"
            className="text-sm px-4 py-2 rounded-lg bg-bg-elevated border border-border-medium text-fg-primary"
            onClick={() => router.push("/crm/accounts")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
