"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Expand, X } from "lucide-react";

import { ProjectIntelligenceChat } from "~/components/projects/ProjectIntelligenceChat";

export function A1ChatWidgetOverlay(props: {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
}) {
  const { isOpen, onClose, projectId } = props;
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close chat"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="absolute right-4 bottom-4 w-[min(420px,calc(100vw-2rem))] h-[min(560px,calc(100vh-2rem))] rounded-2xl overflow-hidden bg-bg-primary shadow-xl border border-white/10 flex flex-col">
        <div className="h-[52px] px-3 flex items-center justify-between gap-2 border-b border-white/10 bg-bg-primary">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg-primary truncate">A1 Assistant</p>
            <p className="text-[11px] text-fg-tertiary truncate">Workspace Concierge</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-bg-elevated text-fg-secondary transition-colors"
              aria-label="Expand"
              onClick={() => {
                onClose();
                router.push("/chat");
              }}
            >
              <Expand size={16} />
            </button>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-bg-elevated text-fg-secondary transition-colors"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ProjectIntelligenceChat projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
