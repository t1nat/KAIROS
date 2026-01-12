"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import Image from "next/image";
import { Send, Paperclip, Search, MoreVertical, X } from "lucide-react";
import { useToast } from "~/components/providers/ToastProvider";
import { useUploadThing } from "~/lib/uploadthing";

type ChatMessage = RouterOutputs["chat"]["listMessages"][number];

export function ChatClient({ userId }: { userId: string }) {
  const toast = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const utils = api.useUtils();
  const { startUpload } = useUploadThing("chatAttachment");

  // Get all conversations
  const conversationsQuery = api.chat.listAllConversations.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const conversations = conversationsQuery.data ?? [];

  // Get messages for selected conversation
  const messagesQuery = api.chat.listMessages.useQuery(
    { conversationId: selectedConversationId ?? -1 },
    {
      enabled: selectedConversationId !== null,
      refetchInterval: 2000,
    }
  );

  const messages = messagesQuery.data ?? [];

  // Send message
  const sendMessage = api.chat.sendMessage.useMutation({
    onMutate: async (variables) => {
      if (!selectedConversationId) return;

      await utils.chat.listMessages.cancel({ conversationId: selectedConversationId });

      const previous = utils.chat.listMessages.getData({ conversationId: selectedConversationId });

      const optimistic: ChatMessage = {
        id: -Date.now(),
        body: variables.body,
        createdAt: new Date(),
        senderId: userId,
        senderName: null,
        senderImage: null,
      };

      utils.chat.listMessages.setData({ conversationId: selectedConversationId }, 
        previous ? [...previous, optimistic] : [optimistic]
      );

      setDraft("");
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (!selectedConversationId || !context?.previous) return;
      utils.chat.listMessages.setData({ conversationId: selectedConversationId }, context.previous);
      toast.error("Failed to send message");
    },
    onSuccess: async (message) => {
      if (selectedConversationId === null) return;
      
      const previous = utils.chat.listMessages.getData({ conversationId: selectedConversationId });
      if (previous) {
        const cleaned = previous.filter((m) => m.id > 0);
        utils.chat.listMessages.setData({ conversationId: selectedConversationId }, [...cleaned, message] as typeof previous);
      }

      await utils.chat.listAllConversations.invalidate();
      
      // Show notification for new message
      toast.success("Message sent");
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const selectedUser = conversations
    .flatMap((c) => [c.userOne, c.userTwo])
    .find((u) => u.id === selectedUserId);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const otherUser = c.userOne.id === userId ? c.userTwo : c.userOne;
    const name = otherUser.name?.toLowerCase() ?? "";
    const email = otherUser.email?.toLowerCase() ?? "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversationId || (!draft.trim() && attachments.length === 0) || sendMessage.isPending || isUploading) return;

    let messageBody = draft.trim();

    // Upload attachments if any
    if (attachments.length > 0) {
      setIsUploading(true);
      try {
        const uploaded = await startUpload(attachments);
        if (uploaded) {
          const attachmentUrls = uploaded.map(f => f.url).join('\n');
          messageBody = messageBody ? `${messageBody}\n\n${attachmentUrls}` : attachmentUrls;
        }
        setAttachments([]);
      } catch (err) {
        console.error("Upload failed:", err);
        toast.error("Failed to upload attachments");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    if (messageBody) {
      sendMessage.mutate({ conversationId: selectedConversationId, body: messageBody });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row h-full w-full">
      {/* Conversations Sidebar */}
      <div className={`${selectedConversationId ? 'hidden sm:flex' : 'flex'} w-full sm:w-72 lg:w-80 xl:w-96 shadow-lg flex-col bg-bg-surface/40`}>
        <div className="p-3 sm:p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-bg-surface shadow-sm rounded-full text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <p className="text-sm text-fg-tertiary text-center">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1.5 sm:p-2">
              {filteredConversations.map((conv) => {
                const otherUser = conv.userOne.id === userId ? conv.userTwo : conv.userOne;
                const lastMessageTime = conv.lastMessageAt
                  ? new Date(conv.lastMessageAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversationId(conv.id);
                      setSelectedUserId(otherUser.id);
                    }}
                    className={`w-full p-2.5 sm:p-3 rounded-xl transition-all text-left flex items-center gap-2.5 sm:gap-3 ${
                      selectedConversationId === conv.id
                        ? "bg-accent-primary/10 shadow-sm"
                        : "hover:bg-bg-elevated shadow-sm"
                    }`}
                  >
                    {otherUser.image ? (
                      <Image
                        src={otherUser.image}
                        alt={otherUser.name ?? "User"}
                        width={44}
                        height={44}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {otherUser.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-fg-primary truncate">
                          {otherUser.name ?? otherUser.email}
                        </p>
                        {lastMessageTime && (
                          <span className="text-xs text-fg-tertiary flex-shrink-0">{lastMessageTime}</span>
                        )}
                      </div>
                      <p className="text-xs text-fg-tertiary truncate">
                        {otherUser.email ?? "User"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${selectedConversationId ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-gradient-to-b from-bg-surface/20 to-bg-primary`}>
        {selectedConversationId && selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 shadow-sm flex items-center justify-between bg-gradient-to-r from-bg-elevated to-bg-surface">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => setSelectedConversationId(null)}
                  className="sm:hidden p-1.5 hover:bg-bg-surface rounded-lg transition-colors text-fg-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                {selectedUser.image ? (
                  <Image
                    src={selectedUser.image}
                    alt={selectedUser.name ?? "User"}
                    width={40}
                    height={40}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-accent-primary/20 flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-accent-primary">
                      {selectedUser.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-bold text-fg-primary truncate">
                    {selectedUser.name ?? selectedUser.email}
                  </h2>
                  <p className="text-xs text-success flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                    Active
                  </p>
                </div>
              </div>
              <button className="p-1.5 sm:p-2 hover:bg-bg-surface rounded-lg transition-colors text-fg-secondary flex-shrink-0">
                <MoreVertical size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center mx-auto mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-accent-primary">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-fg-secondary">No messages yet</p>
                    <p className="text-xs text-fg-tertiary mt-1">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((message, idx) => {
                  const isOwn = message.senderId === userId;
                  const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== message.senderId;

                  return (
                    <div key={`${message.id}-${idx}`} className={`flex items-end gap-1.5 sm:gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                      {showAvatar ? (
                        message.senderImage ? (
                          <Image
                            src={message.senderImage}
                            alt={message.senderName ?? "User"}
                            width={28}
                            height={28}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                            {message.senderName?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )
                      ) : (
                        <div className="w-6 sm:w-7" />
                      )}
                      <div className={`max-w-[75%] sm:max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5 sm:gap-1`}>
                        {showAvatar && !isOwn && (
                          <span className="text-xs font-medium text-fg-secondary px-2.5 sm:px-3">
                            {message.senderName ?? "User"}
                          </span>
                        )}
                        <div
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl ${
                            isOwn
                              ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-br-md"
                              : "bg-bg-elevated text-fg-primary rounded-bl-md"
                          }`}
                        >
                          {(() => {
                            const imageRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?|https?:\/\/utfs\.io\/[^\s]+)/gi;
                            const parts = message.body.split(imageRegex);
                            const matches = message.body.match(imageRegex) ?? [];
                            
                            if (matches.length === 0) {
                              return <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.body}</p>;
                            }
                            
                            return (
                              <div className="flex flex-col gap-2">
                                {parts.map((part, i) => (
                                  <span key={i}>
                                    {part && <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{part.trim()}</p>}
                                    {matches[i] && (
                                      <a href={matches[i]} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                        <Image
                                          src={matches[i]}
                                          alt="Shared image"
                                          width={400}
                                          height={300}
                                          className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                          unoptimized
                                        />
                                      </a>
                                    )}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        <span className="text-xs text-fg-tertiary px-2.5 sm:px-3">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSubmit} className="p-3 sm:p-4 shadow-sm bg-bg-elevated/50">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-2 bg-bg-surface/50 rounded-lg">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated rounded-lg shadow-sm">
                        <span className="text-xs text-fg-secondary truncate max-w-[120px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          className="text-fg-tertiary hover:text-error"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setAttachments([...attachments, ...files]);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 sm:p-2.5 rounded-full hover:bg-bg-surface transition-colors text-accent-primary disabled:opacity-50"
                  title="Attach files"
                >
                  <Paperclip size={18} className="sm:w-5 sm:h-5" />
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isUploading}
                  className="flex-1 text-sm bg-bg-surface shadow-sm rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={(!draft.trim() && attachments.length === 0) || sendMessage.isPending || isUploading}
                  className="p-2.5 sm:p-3 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-8">
              <div className="w-24 h-24 rounded-full bg-accent-primary/10 flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-accent-primary">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-fg-primary mb-2">Your Messages</h3>
              <p className="text-fg-secondary">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
