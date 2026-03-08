<template>
  <Teleport to="body">
    <Transition name="chat-panel">
      <div
        v-if="show"
        class="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p class="text-sm font-semibold text-slate-900">Trò chuyện Workspace</p>
            <p class="text-[11px] text-slate-400">
              {{ realtime.connected.value ? "Đang kết nối realtime" : "Đang thử kết nối..." }}
            </p>
          </div>
          <button class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" @click="emit('close')">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
          <button
            class="rounded-full px-3 py-1 text-xs font-medium"
            :class="activeScope === 'global' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'"
            @click="setScope('global')"
          >
            Global
          </button>
          <button
            class="rounded-full px-3 py-1 text-xs font-medium"
            :class="activeScope === 'project' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'"
            :disabled="!activeProjectId"
            @click="setScope('project')"
          >
            Project
          </button>
          <span v-if="activeScope === 'project'" class="truncate text-[11px] text-slate-400">
            {{ projectLabel }}
          </span>
        </div>

        <div ref="messagesRef" class="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          <div v-if="loading" class="py-4 text-center text-sm text-slate-500">Đang tải tin nhắn...</div>
          <div v-else-if="messages.length === 0" class="py-6 text-center text-sm text-slate-500">
            Chưa có tin nhắn nào
          </div>

          <div
            v-for="message in messages"
            :key="message.id"
            class="rounded-xl border border-slate-100 p-2"
            :class="message.senderUserId === auth.user?.id ? 'bg-brand-50/50' : 'bg-white'"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs font-semibold text-slate-800">{{ message.senderName }}</p>
              <p class="shrink-0 text-[10px] text-slate-400">{{ formatTime(message.createdAt) }}</p>
            </div>
            <p class="mt-1 whitespace-pre-wrap text-xs text-slate-700">{{ message.content }}</p>
            <button
              v-if="message.deepLink?.drawingId"
              class="mt-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-200"
              @click="jumpToDeepLink(message.deepLink)"
            >
              Đến vị trí mention
            </button>
            <img
              v-if="message.hasSnapshot"
              :src="getSnapshotUrl(message.id)"
              alt="snapshot"
              class="mt-2 max-h-40 w-full rounded-lg border border-slate-200 object-cover"
            />
          </div>
        </div>

        <div class="border-t border-slate-100 px-3 py-3">
          <div class="relative">
            <textarea
              ref="draftInputRef"
              v-model="draft"
              rows="3"
              placeholder="Nhập tin nhắn... (gõ @tên để mention)"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
              @input="handleDraftInput"
              @keydown="handleDraftKeydown"
            ></textarea>
            <div
              v-if="showMentionDropdown"
              class="absolute bottom-[calc(100%+6px)] left-0 right-0 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl"
            >
              <button
                v-for="(candidate, index) in filteredMentionCandidates"
                :key="candidate.id"
                type="button"
                class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
                :class="index === activeMentionIndex ? 'bg-brand-50' : ''"
                @mousedown.prevent="selectMentionCandidate(candidate)"
              >
                <span class="min-w-0 flex-1 truncate font-medium text-slate-700">{{ candidate.name }}</span>
                <span class="shrink-0 text-[10px] text-slate-400">@{{ candidate.mentionToken }}</span>
              </button>
            </div>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <p class="text-[11px] text-slate-400">Enter để gửi, Shift+Enter xuống dòng</p>
            <button
              class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="sending || !canSend"
              @click="send"
            >
              {{ sending ? "Đang gửi..." : "Gửi" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/state/useAuth";
import { useRealtime } from "~/composables/state/useRealtime";
import { useSelectedNode } from "~/composables/state/useSelectedNode";
import { useProjectTree } from "~/composables/api/useProjectTree";
import { usePlanViewState } from "~/composables/state/usePlanViewState";
import { useDeepLinkFocus } from "~/composables/state/useDeepLinkFocus";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const auth = useAuth();
const realtime = useRealtime();
const selected = useSelectedNode();
const { getNodeById } = useProjectTree();
const planViewState = usePlanViewState();
const { setDeepLinkFocus } = useDeepLinkFocus();
const config = useRuntimeConfig();
const token = useState<string | null>("auth-token", () => null);
const route = useRoute();

const loading = ref(false);
const sending = ref(false);
const draft = ref("");
const activeScope = ref<"global" | "project">("global");
const messagesRef = ref<HTMLElement | null>(null);
const draftInputRef = ref<HTMLTextAreaElement | null>(null);
const mentionContext = ref<{ start: number; end: number; query: string } | null>(null);
const activeMentionIndex = ref(0);

const activeProjectId = computed(() => selected.value?.projectId || "");

const projectLabel = computed(() => {
  if (!selected.value?.projectId) return "Chưa chọn project";
  return selected.value.name || selected.value.projectId;
});

const messages = computed(() => {
  if (activeScope.value === "global") {
    return realtime.globalMessages.value;
  }
  return realtime.getProjectMessages(activeProjectId.value);
});

const mentionCandidates = computed(() =>
  realtime.getMentionCandidates(
    activeScope.value,
    activeScope.value === "project" ? activeProjectId.value : undefined
  )
);

const filteredMentionCandidates = computed(() => {
  if (!mentionContext.value) return [];
  const query = mentionContext.value.query.toLowerCase();
  const candidates = mentionCandidates.value || [];
  const filtered = candidates.filter((candidate) => {
    if (!query) return true;
    return (
      candidate.mentionToken.toLowerCase().includes(query) ||
      candidate.name.toLowerCase().includes(query) ||
      candidate.email.toLowerCase().includes(query)
    );
  });
  return filtered.slice(0, 8);
});

const showMentionDropdown = computed(
  () => !!mentionContext.value && filteredMentionCandidates.value.length > 0
);

const canSend = computed(() => {
  if (!draft.value.trim()) return false;
  if (activeScope.value === "project" && !activeProjectId.value) return false;
  return true;
});

const formatTime = (value: number | string) => {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getSnapshotUrl = (messageId: string) => {
  const base = `${config.public.apiBase}/chats/messages/${messageId}/snapshot`;
  return token.value ? `${base}?token=${encodeURIComponent(token.value)}` : base;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (!messagesRef.value) return;
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  });
};

const loadMessages = async () => {
  loading.value = true;
  try {
    await realtime.fetchChatMessages(
      activeScope.value,
      activeScope.value === "project" ? activeProjectId.value : undefined
    );
    await realtime.fetchMentionCandidates(
      activeScope.value,
      activeScope.value === "project" ? activeProjectId.value : undefined
    );
    scrollToBottom();
  } finally {
    loading.value = false;
  }
};

const setScope = async (scope: "global" | "project") => {
  if (scope === "project" && !activeProjectId.value) return;
  activeScope.value = scope;
  mentionContext.value = null;
  activeMentionIndex.value = 0;
  await loadMessages();
};

const detectMentionContext = (value: string, caret: number) => {
  const beforeCaret = value.slice(0, caret);
  const matched = /(^|[\s])@([a-zA-Z0-9._-]{0,64})$/.exec(beforeCaret);
  if (!matched) return null;

  const query = matched[2] || "";
  const start = caret - query.length - 1;
  return {
    start,
    end: caret,
    query
  };
};

const refreshMentionContext = () => {
  const input = draftInputRef.value;
  if (!input) {
    mentionContext.value = null;
    activeMentionIndex.value = 0;
    return;
  }

  const caret = input.selectionStart ?? draft.value.length;
  mentionContext.value = detectMentionContext(draft.value, caret);
  activeMentionIndex.value = 0;
};

const selectMentionCandidate = (candidate: { mentionToken: string }) => {
  if (!mentionContext.value) return;

  const { start, end } = mentionContext.value;
  const inserted = `@${candidate.mentionToken} `;
  draft.value = `${draft.value.slice(0, start)}${inserted}${draft.value.slice(end)}`;
  mentionContext.value = null;
  activeMentionIndex.value = 0;

  nextTick(() => {
    const input = draftInputRef.value;
    if (!input) return;
    const nextCaret = start + inserted.length;
    input.focus();
    input.setSelectionRange(nextCaret, nextCaret);
  });
};

const handleDraftInput = () => {
  refreshMentionContext();
};

const handleDraftKeydown = (event: KeyboardEvent) => {
  if (showMentionDropdown.value) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeMentionIndex.value = (activeMentionIndex.value + 1) % filteredMentionCandidates.value.length;
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeMentionIndex.value =
        (activeMentionIndex.value - 1 + filteredMentionCandidates.value.length) %
        filteredMentionCandidates.value.length;
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const candidate = filteredMentionCandidates.value[activeMentionIndex.value];
      if (candidate) {
        selectMentionCandidate(candidate);
      }
      return;
    }

    if (event.key === "Escape") {
      mentionContext.value = null;
      activeMentionIndex.value = 0;
      return;
    }
  }

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void send();
  }
};

const captureSnapshot = () => {
  if (!process.client) return undefined;
  const root = document.getElementById("plan-view-root");
  if (!root) return undefined;
  const canvas = root.querySelector("canvas") as HTMLCanvasElement | null;
  if (!canvas) return undefined;

  try {
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
};

const extractMentionTokens = (content: string) => {
  const matched = content.match(/@([a-zA-Z0-9._-]{2,64})/g) || [];
  return matched.map((item) => item.slice(1).toLowerCase());
};

const jumpToDeepLink = (deepLink?: {
  drawingId?: string;
  taskId?: string;
  pinX?: number;
  pinY?: number;
  zoom?: number;
}) => {
  if (!deepLink?.drawingId) return;

  const matchedNode = getNodeById(deepLink.drawingId);
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
      id: deepLink.drawingId,
      name: "Drawing",
      type: "drawing"
    };
  }

  setDeepLinkFocus({
    drawingId: deepLink.drawingId,
    taskId: deepLink.taskId,
    pinX: deepLink.pinX,
    pinY: deepLink.pinY,
    zoom: deepLink.zoom
  });

  if (route.path !== "/") {
    void navigateTo("/");
  }
};

const send = async () => {
  if (!canSend.value) return;
  const safeContent = draft.value.trim();
  if (!safeContent) return;

  sending.value = true;
  try {
    const hasMention = extractMentionTokens(safeContent).length > 0;
    const snapshotDataUrl = hasMention ? captureSnapshot() : undefined;
    const deepLink = planViewState.value?.drawingId
      ? {
          drawingId: planViewState.value.drawingId,
          taskId: planViewState.value.taskId,
          pinX: planViewState.value.centerX,
          pinY: planViewState.value.centerY,
          zoom: planViewState.value.zoom
        }
      : undefined;

    await realtime.sendChatMessage({
      scope: activeScope.value,
      projectId: activeScope.value === "project" ? activeProjectId.value : undefined,
      content: safeContent,
      deepLink,
      snapshotDataUrl
    });

    draft.value = "";
    mentionContext.value = null;
    activeMentionIndex.value = 0;
    scrollToBottom();
  } finally {
    sending.value = false;
  }
};

watch(
  () => props.show,
  async (isOpen) => {
    if (!isOpen) return;
    await loadMessages();
  },
  { immediate: true }
);

watch(
  () => messages.value.length,
  () => {
    if (!props.show) return;
    scrollToBottom();
  }
);

watch(
  () => activeProjectId.value,
  async () => {
    if (!props.show || activeScope.value !== "project") return;
    await loadMessages();
  }
);
</script>

<style scoped>
.chat-panel-enter-active,
.chat-panel-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.chat-panel-enter-from,
.chat-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
