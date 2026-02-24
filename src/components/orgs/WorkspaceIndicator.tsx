"use client";

import { Copy, ArrowRightLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export function WorkspaceIndicator({ compact = false }: { compact?: boolean }) {
  const tOrg = useTranslations("org");
  const tCommon = useTranslations("common");
  const router = useRouter();
  
  const { data: active } = api.organization.getActive.useQuery();
  
  const [copied, setCopied] = useState(false);
  
  const isOrganization = !!active?.organization;
  const orgName = active?.organization?.name;
  const accessCode = active?.organization?.accessCode;
  
  const copyToClipboard = useCallback(async () => {
    if (!accessCode) return;
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be blocked
    }
  }, [accessCode]);
  
  // Compact mode for header
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/orgs")}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity cursor-pointer"
          title={tOrg("switchOrg")}
        >
          <span className={isOrganization ? 'text-accent-primary' : 'text-blue-500'}>
            {isOrganization ? (orgName ?? tOrg("organization")) : tOrg("personalWorkspace")}
          </span>
          <ArrowRightLeft size={12} className="text-fg-tertiary" />
        </button>
        
        {isOrganization && accessCode && (
          <button
            onClick={() => void copyToClipboard()}
            className="flex items-center gap-2 px-2 py-1 rounded-md bg-bg-surface/80 hover:bg-bg-elevated transition-colors group"
          >
            <span className="font-mono text-xs font-semibold text-fg-primary tracking-[0.15em]">
              {accessCode}
            </span>
            <Copy 
              size={12} 
              className={`transition-colors ${
                copied ? 'text-success' : 'text-fg-tertiary group-hover:text-fg-secondary'
              }`} 
            />
          </button>
        )}
        
        {copied && (
          <span className="text-xs text-success animate-in fade-in slide-in-from-top-1">
            {tCommon("copied")}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-bg-surface/80 to-bg-elevated/50 backdrop-blur-sm">
      {/* Top row - Workspace type and access code */}
      <div className="flex items-center gap-4 mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          isOrganization ? 'text-accent-primary' : 'text-blue-500'
        }`}>
          {isOrganization ? tOrg("organization") : tOrg("personalWorkspace")}
        </span>
        
        {/* Access Code (for organizations) */}
        {isOrganization && accessCode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-tertiary">{tOrg("accessCode")}:</span>
            <button
              onClick={() => void copyToClipboard()}
              className="flex items-center gap-2 px-2 py-1 rounded-md bg-bg-surface hover:bg-bg-elevated transition-colors group"
            >
              <span className="font-mono text-xs font-semibold text-fg-primary tracking-[0.2em]">
                {accessCode}
              </span>
              <Copy 
                size={12} 
                className={`transition-colors ${
                  copied ? 'text-success' : 'text-fg-tertiary group-hover:text-fg-secondary'
                }`} 
              />
            </button>
            {copied && (
              <span className="text-xs text-success animate-in fade-in slide-in-from-top-1">
                {tCommon("copied")}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Workspace name */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-fg-primary truncate tracking-[-0.01em] font-display">
          {isOrganization ? orgName : tOrg("personalWorkspace")}
        </h3>
        
        {/* Personal workspace hint */}
        {!isOrganization && (
          <p className="text-xs text-fg-tertiary max-w-[150px] text-right">
            {tOrg("personalHint")}
          </p>
        )}
      </div>
    </div>
  );
}
