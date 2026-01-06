"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

class ToastManager {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly setToasts: React.Dispatch<React.SetStateAction<Toast[]>>,
    private readonly ttlMs: number
  ) {}

  dispose() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  remove = (id: string) => {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
    this.setToasts((prev) => prev.filter((x) => x.id !== id));
  };

  push = (kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.setToasts((prev) => [...prev, { id, kind, message }]);
    const t = setTimeout(() => this.remove(id), this.ttlMs);
    this.timers.set(id, t);
  };
}

function toastClasses(kind: ToastKind) {
  switch (kind) {
    case "success":
      return "bg-success/10 border-success/30 text-success";
    case "error":
      return "bg-error/10 border-error/30 text-error";
    case "info":
    default:
      return "bg-info/10 border-info/30 text-info";
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const managerRef = useRef<ToastManager | null>(null);
  managerRef.current ??= new ToastManager(setToasts, 3000);

  useEffect(() => {
    const manager = managerRef.current;
    return () => manager?.dispose();
  }, []);

  const remove = useCallback((id: string) => managerRef.current?.remove(id), []);
  const push = useCallback(
    (kind: ToastKind, message: string) => managerRef.current?.push(kind, message),
    []
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${toastClasses(t.kind)}`}
            onClick={() => remove(t.id)}
          >
            <p className="text-sm font-medium text-fg-primary">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
