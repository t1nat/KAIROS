"use client";

import { useCallback, useState } from "react";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export function OrgAccessCodeBadge() {
  const tOrg = useTranslations("org");
  const tCommon = useTranslations("common");

  const { data: active } = api.organization.getActive.useQuery();
  const accessCode = active?.organization?.accessCode;
  const show = !!accessCode;

  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    if (!accessCode) return;

    try {
      await navigator.clipboard.writeText(accessCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op: clipboard may be blocked; we keep UI minimal here
    }
  }, [accessCode]);

  if (!show) return null;

  const copyLabel = copied ? tCommon("copied") : tCommon("copy");

  return (
    <div className="hidden sm:flex items-center gap-2 rounded-xl bg-bg-surface border border-border-light px-3 py-2">
      <span className="text-xs font-medium text-fg-tertiary">
        {tOrg("accessCode")}
      </span>
      <span className="font-mono text-sm text-fg-primary tracking-[0.25em]">
        {accessCode}
      </span>
      <button
        type="button"
        onClick={() => void copyToClipboard()}
        className="ml-1 w-8 h-8 rounded-lg bg-bg-secondary/40 border border-border-light/20 hover:bg-bg-secondary/60 hover:border-border-light/40 transition-colors flex items-center justify-center"
        aria-label={copyLabel}
        title={copyLabel}
      >
        <Copy size={16} className="text-fg-secondary" />
      </button>
    </div>
  );
}
