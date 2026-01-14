"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface CollaboratorItemProps {
  user: User;
  permission: "read" | "write";
  isOwner: boolean;
  onUpdatePermission?: (userId: string, permission: "read" | "write") => void;
  onRemove?: (userId: string) => void;
  showControls?: boolean;
}

export function CollaboratorItem({
  user,
  permission,
  isOwner,
  onUpdatePermission,
  onRemove,
  showControls = true,
}: CollaboratorItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-bg-surface/50 rounded-lg ios-card hover:bg-bg-elevated transition-all">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "User"}
            width={32}
            height={32}
            className="rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-semibold text-xs">
            {user.name?.[0] ?? user.email[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg-primary truncate">
            {user.name ?? user.email}
          </p>
          {user.name && (
            <p className="text-xs text-fg-secondary truncate">{user.email}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOwner && showControls && onUpdatePermission && onRemove ? (
          <>
            <select
              value={permission}
              onChange={(e) => onUpdatePermission(user.id, e.target.value as "read" | "write")}
              className="px-3 py-1.5 text-xs shadow-sm bg-bg-surface/50 rounded-lg text-fg-primary hover:bg-bg-elevated transition-all"
            >
              <option value="read" className="bg-bg-secondary text-fg-primary">View</option>
              <option value="write" className="bg-bg-secondary text-fg-primary">Edit</option>
            </select>
            <button
              onClick={() => onRemove(user.id)}
              className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
              title="Remove collaborator"
            >
              <Trash2 size={14} />
            </button>
          </>
        ) : (
          <span className="px-3 py-1.5 text-xs font-medium bg-bg-surface/50 text-fg-secondary rounded-lg shadow-sm">
            {permission === "read" ? "View" : "Edit"}
          </span>
        )}
      </div>
    </div>
  );
}