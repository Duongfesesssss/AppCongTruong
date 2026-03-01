import type { Server as HttpServer } from "node:http";

import jwt from "jsonwebtoken";
import { Server, type Socket } from "socket.io";

import { config } from "../lib/config";
import type { AuthUser } from "../middlewares/require-auth";

type RealtimeEventName = "connected" | "notification:new" | "notification:read" | "chat:message" | "ping";

let io: Server | null = null;

const userRoom = (userId: string) => `user:${userId}`;

const parseTokenFromSocket = (socket: Socket): string | undefined => {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth) return fromAuth;

  const fromQuery = socket.handshake.query?.token;
  if (typeof fromQuery === "string" && fromQuery) return fromQuery;

  const authorization = socket.handshake.headers.authorization;
  if (typeof authorization === "string") {
    const [type, value] = authorization.split(" ");
    if (type === "Bearer" && value) return value;
  }

  return undefined;
};

const parseAllowedOrigins = () =>
  config.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const initRealtimeServer = (httpServer: HttpServer) => {
  if (io) return io;

  const allowedOrigins = parseAllowedOrigins();
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = parseTokenFromSocket(socket);
    if (!token) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    try {
      const payload = jwt.verify(token, config.jwtAccessSecret) as AuthUser;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthUser | undefined;
    if (!user?.id) {
      socket.disconnect(true);
      return;
    }

    socket.join(userRoom(user.id));
    socket.emit("connected", {
      clientId: socket.id,
      connectedAt: Date.now()
    });
  });

  return io;
};

export const publishToUser = (userId: string, event: RealtimeEventName, payload: unknown) => {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload ?? {});
};

export const publishToUsers = (userIds: string[], event: RealtimeEventName, payload: unknown) => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  uniqueUserIds.forEach((userId) => publishToUser(userId, event, payload));
};

export const publishHeartbeat = (userId: string) => {
  publishToUser(userId, "ping", { at: Date.now() });
};
