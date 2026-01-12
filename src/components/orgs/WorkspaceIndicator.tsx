"use client";

import { Building2, User, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export function WorkspaceIndicator() {
  const tOrg = useTranslations("org");
  const tCommon = useTranslations("common");
  
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
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-bg-surface/80 to-bg-elevated/50 backdrop-blur-sm">
      {/* Workspace Type Icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isOrganization 
          ? 'bg-gradient-to-br from-accent-primary to-accent-secondary shadow-lg shadow-accent-primary/20' 
          : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20'
      }`}>
        {isOrganization ? (
          <Building2 className="text-white" size={24} />
        ) : (
          <User className="text-white" size={24} />
        )}
      </div>
      
      {/* Workspace Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            isOrganization ? 'text-accent-primary' : 'text-blue-500'
          }`}>
            {isOrganization ? tOrg("organization") : tOrg("personalWorkspace")}
          </span>
        </div>
        
        <h3 className="text-lg font-bold text-fg-primary truncate">
          {isOrganization ? orgName : tOrg("personalWorkspace")}
        </h3>
      </div>
      
      {/* Access Code (for organizations) */}
      {isOrganization && accessCode && (
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-fg-tertiary">{tOrg("accessCode")}</span>
          <button
            onClick={() => void copyToClipboard()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-surface hover:bg-bg-elevated transition-colors group"
          >
            <span className="font-mono text-sm font-semibold text-fg-primary tracking-[0.2em]">
              {accessCode}
            </span>
            <Copy 
              size={14} 
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
      
      {/* Personal workspace hint */}
      {!isOrganization && (
        <div className="text-right">
          <p className="text-xs text-fg-tertiary max-w-[150px]">
            {tOrg("personalHint")}
          </p>
        </div>
      )}
    </div>
  );
}
