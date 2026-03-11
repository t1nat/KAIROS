"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    // Only connect when the user is authenticated.
    if (status !== "authenticated") return;

    const s = io({
      path: "/api/socketio",
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    s.on("connect", () => {
      console.log("[Socket.IO] connected:", s.id);
      setConnected(true);
    });

    s.on("disconnect", (reason) => {
      console.log("[Socket.IO] disconnected:", reason);
      setConnected(false);
    });

    s.on("reconnect", (attempt: number) => {
      console.log("[Socket.IO] reconnected after", attempt, "attempts");
      setConnected(true);
    });

    s.on("connect_error", (err) => {
      console.error("[Socket.IO] connection error:", err.message);
      setConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [status]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>
  );
}

/**
 * Returns the Socket.IO client instance (or `null` if not yet connected).
 */
export function useSocket(): Socket | null {
  return useContext(SocketContext).socket;
}

/**
 * Returns whether the Socket.IO client is currently connected.
 */
export function useSocketConnected(): boolean {
  return useContext(SocketContext).connected;
}
