"use client";

import { useState } from "react";
import { Sparkles, MessageCircle } from "lucide-react";
import { ChatClient } from "~/components/chat/ChatClient";
import { ProjectIntelligenceChat } from "~/components/projects/ProjectIntelligenceChat";

export function ChatPageTabs({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<"ai" | "messages">("messages");

  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-2 bg-bg-primary">
        <button
          onClick={() => setActiveTab("messages")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "messages"
              ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/25 shadow-sm"
              : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
          }`}
        >
          <MessageCircle size={18} />
          Messages
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "ai"
              ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/25 shadow-sm"
              : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
          }`}
        >
          <Sparkles size={18} />
          AI Assistant
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "messages" ? (
          <ChatClient userId={userId} />
        ) : (
          <ProjectIntelligenceChat />
        )}
      </div>
    </div>
  );
}
