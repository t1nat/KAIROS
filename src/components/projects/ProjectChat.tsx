"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { MessageBox } from "react-chat-elements";
import Image from "next/image";

const MessageBubble = MessageBox as unknown as ComponentType<{
  position: "left" | "right";
  type: "text";
  text: string;
  title?: string;
  date?: Date;
  avatar?: string;
}>;

type ChatUser = {
  id: string;
  name: string | null;
  image: string | null;
};

type ListMessagesOutput = RouterOutputs["chat"]["listMessages"];
type SendMessageOutput = RouterOutputs["chat"]["sendMessage"];
type ChatMessage = ListMessagesOutput[number];

export function ProjectChat({ projectId, currentUserId }: { projectId: number; currentUserId: string }) {
  const utils = api.useUtils();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const listUsers = api.chat.listProjectUsers.useQuery(
    { projectId },
    {
      staleTime: 1000 * 60,
    },
  );

  const otherUsers: ChatUser[] = useMemo(() => listUsers.data ?? [], [listUsers.data]);

  const getOrCreate = api.chat.getOrCreateProjectConversation.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
    },
  });

  useEffect(() => {
    if (!selectedUserId || getOrCreate.isPending) {
      if (!selectedUserId) setConversationId(null);
      return;
    }

    void getOrCreate.mutateAsync({ projectId, otherUserId: selectedUserId });
  }, [selectedUserId, projectId, getOrCreate.isPending, getOrCreate]);

  const messagesQuery = api.chat.listMessages.useQuery(
    { conversationId: conversationId ?? -1 },
    {
      enabled: conversationId !== null,
      refetchInterval: 500,
      refetchOnWindowFocus: true,
    },
  );

  const messages = (messagesQuery.data ?? []) as unknown as ListMessagesOutput;

  const sendMessage = api.chat.sendMessage.useMutation({
    onMutate: async (variables) => {
      if (!conversationId) return;

      await utils.chat.listMessages.cancel({ conversationId });

      const previous = utils.chat.listMessages.getData({ conversationId }) as unknown as
        | ListMessagesOutput
        | undefined;

      const optimistic: ChatMessage = {
        id: -Date.now(),
        body: variables.body,
        createdAt: new Date(),
        senderId: currentUserId,
        senderName: null,
        senderImage: null,
      };

      utils.chat.listMessages.setData({ conversationId }, (old) => {
        const arr = (old ?? []) as unknown as ListMessagesOutput;
        return [...arr, optimistic] as unknown as typeof old;
      });

      setDraft("");

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (!conversationId) return;
      if (context?.previous) utils.chat.listMessages.setData({ conversationId }, context.previous);
    },
    onSuccess: async (message: SendMessageOutput) => {
      if (conversationId === null) return;
      utils.chat.listMessages.setData({ conversationId }, (old) => {
        const arr = (old ?? []) as unknown as ListMessagesOutput;
        // Drop optimistic placeholders, append confirmed message.
        const cleaned = arr.filter((m) => m.id > 0);
        return [...cleaned, message] as unknown as typeof old;
      });

      await utils.chat.listProjectConversations.invalidate({ projectId });
    },
    onSettled: async () => {
      if (conversationId !== null) await utils.chat.listMessages.invalidate({ conversationId });
    },
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, conversationId]);

  const selectedUser = otherUsers.find((u) => u.id === selectedUserId);

  return (
    <div className="surface-card overflow-hidden flex flex-col h-full min-h-[420px] lg:h-[calc(100vh-12rem)] shadow-lg">
      <div className="px-4 py-3 border-b border-border-light/20 flex items-center justify-between gap-3 bg-gradient-to-r from-bg-elevated to-bg-surface">
        <div className="min-w-0 flex items-center gap-2">
          {selectedUser?.image ? (
            <Image src={selectedUser.image} alt={selectedUser.name ?? "User"} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-accent-primary">{selectedUser?.name?.[0] ?? "?"}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-fg-primary">{selectedUser ? selectedUser.name ?? "User" : "Chat"}</p>
            <p className="text-xs text-fg-tertiary truncate">
              {selectedUser ? "Active" : "Select a user to start"}
            </p>
          </div>
        </div>

        <select
          className="text-sm bg-bg-surface border border-border-light/30 rounded-lg px-3 py-2 text-fg-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
          value={selectedUserId ?? ""}
          onChange={(e) => setSelectedUserId(e.target.value || null)}
        >
          <option value="">Select user…</option>
          {otherUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? "User"}
            </option>
          ))}
        </select>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 bg-gradient-to-b from-bg-surface/20 to-bg-primary">
        {!selectedUserId && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-accent-primary">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-fg-secondary">Your Messages</p>
              <p className="text-xs text-fg-tertiary mt-1">Select a user to start chatting</p>
            </div>
          </div>
        )}

        {selectedUserId && messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-fg-tertiary">No messages yet.</p>
          </div>
        )}

        {selectedUserId &&
          messages.map((m, idx) => (
            <div key={`${m.id}-${idx}`} className="my-2">
              <MessageBubble
                position={m.senderId === currentUserId ? "right" : "left"}
                type="text"
                text={m.body}
                title={m.senderName ?? undefined}
                date={new Date(m.createdAt)}
                avatar={m.senderImage ?? undefined}
              />
            </div>
          ))}
      </div>

      <form
        className="p-3 border-t border-border-light/20 flex items-center gap-2 bg-bg-elevated/50"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body || conversationId === null || sendMessage.isPending) return;
          sendMessage.mutate({ conversationId, body });
        }}
      >
        <button
          type="button"
          className="p-2 rounded-full hover:bg-bg-surface transition-colors text-accent-primary"
          title="Attach photo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={selectedUserId ? "Message..." : "Select a user..."}
          disabled={!selectedUserId || conversationId === null}
          className="flex-1 text-sm bg-bg-surface border border-border-light/30 rounded-full px-4 py-2.5 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!selectedUserId || conversationId === null || sendMessage.isPending || draft.trim().length === 0}
          className="px-4 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-accent-primary to-accent-secondary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}
