import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

const WS_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/v1").replace(/\/v1\/?$/, "");

let socket: Socket | null = null;
let socketToken: string | null = null;

function getSocket(token: string): Socket {
  if (socket && socketToken === token) {
    return socket;
  }
  socket?.close();
  socket = io(WS_BASE, { auth: { token }, transports: ["websocket"] });
  socketToken = token;
  return socket;
}

/** Subscribes to a real-time event while mounted — see apps/api/src/realtime for what's emitted. */
export function useRealtimeEvent(token: string | undefined, event: string, onEvent: (payload: unknown) => void) {
  useEffect(() => {
    if (!token) return;
    const s = getSocket(token);
    s.on(event, onEvent);
    return () => {
      s.off(event, onEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, event]);
}
