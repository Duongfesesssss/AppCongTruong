import { io, type Socket } from "socket.io-client";

import { useApi } from "~/composables/api/useApi";

export type RealtimeNotification = {
  id: string;
  recipientUserId: string;
  actorUserId?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt?: number | string | null;
  createdAt: number | string;
};

export type ChatScope = "global" | "project";

export type ChatMessage = {
  id: string;
  scope: ChatScope;
  projectId?: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  mentions: string[];
  deepLink?: {
    drawingId?: string;
    taskId?: string;
    pinX?: number;
    pinY?: number;
    zoom?: number;
  };
  hasSnapshot?: boolean;
  createdAt: number | string;
};

export type MentionCandidate = {
  id: string;
  name: string;
  email: string;
  mentionToken: string;
};

type SendChatPayload = {
  scope: ChatScope;
  projectId?: string;
  content: string;
  deepLink?: {
    drawingId?: string;
    taskId?: string;
    pinX?: number;
    pinY?: number;
    zoom?: number;
  };
  snapshotDataUrl?: string;
};

let socket: Socket | null = null;
let socketToken = "";

const normalizeErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  return "Có lỗi xảy ra";
};

const appendMessage = (list: ChatMessage[], next: ChatMessage) => {
  const exists = list.some((item) => item.id === next.id);
  if (exists) return list;
  return [...list, next].slice(-200);
};

const getMentionKey = (scope: ChatScope, projectId?: string) =>
  scope === "global" ? "global" : `project:${projectId || "unknown"}`;

export const useRealtime = () => {
  const api = useApi();
  const config = useRuntimeConfig();
  const token = useState<string | null>("auth-token", () => null);
  const initialized = useState<boolean>("realtime-initialized", () => false);
  const connected = useState<boolean>("realtime-connected", () => false);
  const notifications = useState<RealtimeNotification[]>("realtime-notifications", () => []);
  const globalMessages = useState<ChatMessage[]>("realtime-chat-global", () => []);
  const projectMessages = useState<Record<string, ChatMessage[]>>("realtime-chat-projects", () => ({}));
  const mentionCandidates = useState<Record<string, MentionCandidate[]>>("realtime-mention-candidates", () => ({}));
  const lastError = useState<string>("realtime-last-error", () => "");

  const unreadCount = computed(() => notifications.value.filter((item) => !item.readAt).length);

  const closeSocket = () => {
    if (!socket) return;
    socket.disconnect();
    socket = null;
    socketToken = "";
    connected.value = false;
  };

  const handleIncomingNotification = (notification: RealtimeNotification) => {
    const withoutCurrent = notifications.value.filter((item) => item.id !== notification.id);
    notifications.value = [notification, ...withoutCurrent].slice(0, 200);
  };

  const handleNotificationRead = (payload: { id?: string; all?: boolean; readAt?: number }) => {
    if (payload.all) {
      notifications.value = notifications.value.map((item) => ({
        ...item,
        readAt: payload.readAt || Date.now()
      }));
      return;
    }

    if (!payload.id) return;
    notifications.value = notifications.value.map((item) =>
      item.id === payload.id
        ? {
            ...item,
            readAt: payload.readAt || Date.now()
          }
        : item
    );
  };

  const handleIncomingChatMessage = (message: ChatMessage) => {
    if (message.scope === "global") {
      globalMessages.value = appendMessage(globalMessages.value, message);
      return;
    }

    if (!message.projectId) return;
    const existing = projectMessages.value[message.projectId] || [];
    projectMessages.value = {
      ...projectMessages.value,
      [message.projectId]: appendMessage(existing, message)
    };
  };

  const startSocket = () => {
    if (!process.client || !token.value) return;
    if (socket && socketToken === token.value) return;

    closeSocket();
    const socketBaseUrl = config.public.apiBase.replace(/\/api\/?$/, "");
    socket = io(socketBaseUrl, {
      auth: {
        token: token.value
      },
      withCredentials: true,
      transports: ["websocket", "polling"]
    });
    socketToken = token.value;

    socket.on("connect", () => {
      connected.value = true;
      lastError.value = "";
    });

    socket.on("disconnect", () => {
      connected.value = false;
    });

    socket.on("connect_error", (err: unknown) => {
      connected.value = false;
      lastError.value = normalizeErrorMessage(err) || "Không thể kết nối realtime";
    });

    socket.on("connected", () => {
      connected.value = true;
      lastError.value = "";
    });

    socket.on("notification:new", (payload: RealtimeNotification) => {
      handleIncomingNotification(payload);
    });

    socket.on("notification:read", (payload: { id?: string; all?: boolean; readAt?: number }) => {
      handleNotificationRead(payload);
    });

    socket.on("chat:message", (payload: ChatMessage) => {
      handleIncomingChatMessage(payload);
    });
  };

  const ensureStarted = () => {
    if (!process.client || !token.value) return;
    startSocket();
  };

  const init = () => {
    if (initialized.value) {
      ensureStarted();
      return;
    }
    initialized.value = true;
    ensureStarted();
  };

  const fetchNotifications = async (unreadOnly = false) => {
    const query = unreadOnly ? "?unreadOnly=1&limit=100" : "?limit=100";
    const data = await api.get<RealtimeNotification[]>(`/notifications${query}`);
    notifications.value = data || [];
    return notifications.value;
  };

  const markNotificationRead = async (notificationId: string) => {
    await api.patch<RealtimeNotification>(`/notifications/${notificationId}/read`, {});
    handleNotificationRead({ id: notificationId, readAt: Date.now() });
  };

  const markAllNotificationsRead = async () => {
    await api.post("/notifications/read-all", {});
    handleNotificationRead({ all: true, readAt: Date.now() });
  };

  const fetchChatMessages = async (scope: ChatScope, projectId?: string) => {
    if (scope === "project" && !projectId) return [];
    const query = new URLSearchParams();
    query.set("scope", scope);
    query.set("limit", "80");
    if (projectId) query.set("projectId", projectId);

    const data = await api.get<ChatMessage[]>(`/chats/messages?${query.toString()}`);
    if (scope === "global") {
      globalMessages.value = data || [];
      return globalMessages.value;
    }

    projectMessages.value = {
      ...projectMessages.value,
      [projectId!]: data || []
    };
    return projectMessages.value[projectId!] || [];
  };

  const sendChatMessage = async (payload: SendChatPayload) => {
    const message = await api.post<ChatMessage>("/chats/messages", payload);
    handleIncomingChatMessage(message);
    return message;
  };

  const fetchMentionCandidates = async (scope: ChatScope, projectId?: string) => {
    if (scope === "project" && !projectId) return [];

    const query = new URLSearchParams();
    query.set("scope", scope);
    if (projectId) query.set("projectId", projectId);
    const data = await api.get<MentionCandidate[]>(`/chats/mention-candidates?${query.toString()}`);

    const key = getMentionKey(scope, projectId);
    mentionCandidates.value = {
      ...mentionCandidates.value,
      [key]: data || []
    };

    return mentionCandidates.value[key] || [];
  };

  const getMentionCandidates = (scope: ChatScope, projectId?: string) => {
    const key = getMentionKey(scope, projectId);
    return mentionCandidates.value[key] || [];
  };

  const getProjectMessages = (projectId?: string) => {
    if (!projectId) return [];
    return projectMessages.value[projectId] || [];
  };

  watch(
    () => token.value,
    (nextToken) => {
      if (!nextToken) {
        closeSocket();
        notifications.value = [];
        return;
      }
      ensureStarted();
    }
  );

  onBeforeUnmount(() => {
    // Keep socket alive globally across pages.
  });

  return {
    connected,
    initialized,
    notifications,
    unreadCount,
    globalMessages,
    projectMessages,
    lastError,
    init,
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    fetchChatMessages,
    sendChatMessage,
    fetchMentionCandidates,
    getMentionCandidates,
    getProjectMessages,
    closeSocket,
    closeStream: closeSocket
  };
};
