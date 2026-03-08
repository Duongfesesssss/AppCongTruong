<template>
  <div ref="rootRef" class="relative">
    <button
      class="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
      title="Thông báo"
      @click="toggleOpen"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span
        v-if="realtime.unreadCount.value > 0"
        class="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] font-semibold text-white"
      >
        {{ displayUnreadCount }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-2 w-[320px] max-w-[85vw] rounded-xl border border-slate-200 bg-white shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p class="text-sm font-semibold text-slate-900">Thông báo</p>
        <button
          class="text-xs text-brand-600 hover:text-brand-700"
          :disabled="realtime.unreadCount.value === 0"
          @click="markAllRead"
        >
          Đánh dấu đã đọc
        </button>
      </div>

      <div class="max-h-[360px] overflow-y-auto">
        <div v-if="loading" class="px-3 py-6 text-center text-sm text-slate-500">Đang tải...</div>
        <div
          v-else-if="realtime.notifications.value.length === 0"
          class="px-3 py-6 text-center text-sm text-slate-500"
        >
          Chưa có thông báo
        </div>
        <button
          v-for="item in realtime.notifications.value"
          :key="item.id"
          class="w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
          :class="!item.readAt ? 'bg-brand-50/50' : ''"
          @click="handleNotificationClick(item)"
        >
          <p class="text-xs font-semibold text-slate-900">{{ item.title }}</p>
          <p class="mt-0.5 line-clamp-2 text-xs text-slate-600">{{ item.message }}</p>
          <p class="mt-1 text-[10px] text-slate-400">{{ formatTime(item.createdAt) }}</p>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RealtimeNotification } from "~/composables/state/useRealtime";
import { useRealtime } from "~/composables/state/useRealtime";
import { useSelectedNode } from "~/composables/state/useSelectedNode";
import { useProjectTree } from "~/composables/api/useProjectTree";
import { useDeepLinkFocus } from "~/composables/state/useDeepLinkFocus";
import { useChatPanel } from "~/composables/state/useChatPanel";

const realtime = useRealtime();
const chatPanel = useChatPanel();
const selected = useSelectedNode();
const { getNodeById } = useProjectTree();
const { setDeepLinkFocus } = useDeepLinkFocus();
const route = useRoute();

const rootRef = ref<HTMLElement | null>(null);
const open = ref(false);
const loading = ref(false);

const displayUnreadCount = computed(() => {
  const count = realtime.unreadCount.value;
  if (count > 99) return "99+";
  return `${count}`;
});

const formatTime = (value: string | number) => {
  const date = new Date(value);
  return date.toLocaleString("vi-VN");
};

const fetchNotifications = async () => {
  loading.value = true;
  try {
    await realtime.fetchNotifications();
  } finally {
    loading.value = false;
  }
};

const navigateToDeepLink = (data: Record<string, unknown>) => {
  const drawingId = typeof data.deepLink === "object" ? (data.deepLink as any)?.drawingId : undefined;
  if (!drawingId || typeof drawingId !== "string") return;

  const matchedNode = getNodeById(drawingId);
  if (matchedNode) {
    selected.value = {
      id: matchedNode.id,
      name: matchedNode.name,
      type: matchedNode.type,
      projectId: matchedNode.projectId,
      projectRole: matchedNode.projectRole,
      canManageStructure: matchedNode.canManageStructure,
      drawingCode: matchedNode.drawingCode,
      versionIndex: matchedNode.versionIndex
    };
  } else {
    selected.value = {
      id: drawingId,
      name: "Drawing",
      type: "drawing"
    };
  }

  const deepLink = (data.deepLink || {}) as {
    drawingId?: string;
    taskId?: string;
    pinX?: number;
    pinY?: number;
    zoom?: number;
  };
  setDeepLinkFocus({
    drawingId: deepLink.drawingId || drawingId,
    taskId: deepLink.taskId,
    pinX: deepLink.pinX,
    pinY: deepLink.pinY,
    zoom: deepLink.zoom
  });
};

const handleNotificationClick = async (item: RealtimeNotification) => {
  if (!item.readAt) {
    await realtime.markNotificationRead(item.id);
  }

  open.value = false;

  const data = (item.data || {}) as Record<string, unknown>;

  if (item.type === "mention") {
    // Open chat panel focused on the right scope/project
    const scope = data.scope as string | undefined;
    const projectId = data.projectId as string | undefined;
    chatPanel.openWithFocus(
      scope === "project" && projectId
        ? { scope: "project", projectId }
        : { scope: "global" }
    );

    // Also navigate to drawing deeplink if present
    if (data.deepLink) {
      navigateToDeepLink(data);
      if (route.path !== "/") await navigateTo("/");
    }
    return;
  }

  // Other notification types: just navigate to deeplink
  if (data.deepLink) {
    navigateToDeepLink(data);
    if (route.path !== "/") await navigateTo("/");
  }
};

const markAllRead = async () => {
  if (realtime.unreadCount.value === 0) return;
  await realtime.markAllNotificationsRead();
};

const toggleOpen = async () => {
  open.value = !open.value;
  if (open.value) {
    await fetchNotifications();
  }
};

const handleGlobalClick = (event: MouseEvent) => {
  if (!open.value) return;
  const target = event.target as Node | null;
  if (!target || !rootRef.value) return;
  if (rootRef.value.contains(target)) return;
  open.value = false;
};

onMounted(() => {
  document.addEventListener("click", handleGlobalClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleGlobalClick);
});
</script>
