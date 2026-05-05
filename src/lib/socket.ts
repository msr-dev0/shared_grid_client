import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    socket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}
