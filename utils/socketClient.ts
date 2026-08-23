import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentUrl: string | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function getOrCreateSocket(url: string): Socket {
  if (socket && currentUrl === url) return socket;

  // URL 바뀌면 기존 소켓 정리 후 새로 생성
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch {}
  }

  currentUrl = url;

  socket = io(url, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 8000,
  });

  return socket;
}

export function destroySocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {}
  socket = null;
  currentUrl = null;
}
