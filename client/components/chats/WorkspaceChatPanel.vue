<template>
  <Teleport to="body">
    <Transition name="chat-panel">
      <div
        v-if="show"
        class="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[520px] border-l border-slate-200 bg-white shadow-2xl"
      >
        <!-- Sidebar -->
        <div class="flex w-[160px] shrink-0 flex-col border-r border-slate-100 bg-slate-50">
          <div class="flex items-center justify-between border-b border-slate-200 px-3 py-3">
            <p class="text-xs font-semibold text-slate-700">Chat</p>
            <button class="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600" @click="emit('close')">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto py-2">
            <!-- Global -->
            <button
              class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition-colors"
              :class="isGlobal ? 'bg-brand-100 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100'"
              @click="switchTo({ scope: 'global' })"
            >
              <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2" />
                <path stroke-linecap="round" stroke-width="2" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
              <span class="truncate">Global</span>
            </button>

            <!-- Projects -->
            <p class="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dự án</p>
            <button
              v-for="proj in projectList"
              :key="proj.id"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition-colors"
              :class="isProject(proj.id) ? 'bg-brand-100 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100'"
              @click="switchTo({ scope: 'project', projectId: proj.id })"
            >
              <svg class="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              <span class="truncate">{{ proj.name }}</span>
            </button>
            <p v-if="projectList.length === 0" class="px-3 py-1 text-[11px] text-slate-400">Chưa có dự án</p>

            <!-- DMs -->
            <div class="mt-3 flex items-center justify-between px-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tin nhắn</p>
              <button
                class="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-brand-600"
                title="Nhắn tin mới"
                @click="showNewDmDropdown = !showNewDmDropdown"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <!-- New DM user picker -->
            <div v-if="showNewDmDropdown" class="relative px-2 pb-1">
              <input
                ref="dmSearchRef"
                v-model="dmSearchQuery"
                type="text"
                placeholder="Tìm người..."
                class="w-full rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-400"
                @blur="handleDmSearchBlur"
              />
              <div
                v-if="filteredDmUsers.length > 0"
                class="absolute left-2 right-2 top-full z-10 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
              >
                <button
                  v-for="user in filteredDmUsers"
                  :key="user.id"
                  class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-brand-50"
                  @mousedown.prevent="startDm(user)"
                >
                  <span class="min-w-0 flex-1 truncate font-medium text-slate-700">{{ user.name }}</span>
                </button>
              </div>
            </div>

            <button
              v-for="conv in realtime.dmConversations.value"
              :key="conv.partnerId"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition-colors"
              :class="isDm(conv.partnerId) ? 'bg-brand-100 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100'"
              @click="switchTo({ scope: 'dm', dmPartnerId: conv.partnerId })"
            >
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                {{ (conv.partnerName || '?')[0].toUpperCase() }}
              </span>
              <span class="truncate">{{ conv.partnerName }}</span>
            </button>
          </div>

          <!-- Connection status -->
          <div class="border-t border-slate-200 px-3 py-2">
            <div class="flex items-center gap-1.5">
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="realtime.connected.value ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'"
              ></span>
              <span class="text-[10px] text-slate-400">
                {{ realtime.connected.value ? 'Online' : 'Đang kết nối...' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Main chat area -->
        <div class="flex min-w-0 flex-1 flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">{{ convLabel }}</p>
              <p v-if="activeConv.scope === 'dm'" class="text-[11px] text-slate-400">Tin nhắn riêng</p>
              <p v-else-if="activeConv.scope === 'project'" class="text-[11px] text-slate-400">Chat dự án</p>
              <p v-else class="text-[11px] text-slate-400">Chat toàn workspace</p>
            </div>
          </div>

          <!-- Messages -->
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

          <!-- Input area -->
          <div class="border-t border-slate-100 px-3 py-3">
            <div class="relative">
              <textarea
                ref="draftInputRef"
                v-model="draft"
                rows="3"
                :placeholder="activeConv.scope === 'dm' ? 'Nhắn tin riêng...' : 'Nhập tin nhắn... (gõ @tên để mention)'"
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
              <p class="text-[11px] text-slate-400">Enter gửi · Shift+Enter xuống dòng</p>
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
import { useChatPanel, type ChatFocus } from "~/composables/state/useChatPanel";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const auth = useAuth();
const realtime = useRealtime();
const chatPanel = useChatPanel();
const selected = useSelectedNode();
const { nodes: treeNodes, getNodeById } = useProjectTree();
const planViewState = usePlanViewState();
const { setDeepLinkFocus } = useDeepLinkFocus();
const config = useRuntimeConfig();
const token = useState<string | null>("auth-token", () => null);
const route = useRoute();

// Active conversation
type ActiveConv =
  | { scope: 'global' }
  | { scope: 'project'; projectId: string }
  | { scope: 'dm'; dmPartnerId: string };

const activeConv = ref<ActiveConv>({ scope: 'global' });

// UI state
const loading = ref(false);
const sending = ref(false);
const draft = ref("");
const messagesRef = ref<HTMLElement | null>(null);
const draftInputRef = ref<HTMLTextAreaElement | null>(null);
const mentionContext = ref<{ start: number; end: number; query: string } | null>(null);
const activeMentionIndex = ref(0);
const showNewDmDropdown = ref(false);
const dmSearchQuery = ref("");
const dmSearchRef = ref<HTMLInputElement | null>(null);

// Project list from tree
const projectList = computed(() => {
  const seen = new Set<string>();
  const result: { id: string; name: string }[] = [];
  for (const node of treeNodes.value) {
    if (node.type === 'project' && !seen.has(node.id)) {
      seen.add(node.id);
      result.push({ id: node.id, name: node.name });
    }
  }
  return result;
});

// DM user search candidates (from global mention candidates)
const allMentionCandidates = computed(() => realtime.getMentionCandidates('global'));
const filteredDmUsers = computed(() => {
  const q = dmSearchQuery.value.toLowerCase().trim();
  const myId = auth.user?.id;
  return allMentionCandidates.value
    .filter(c => c.id !== myId && (!q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)))
    .slice(0, 8);
});

// Helpers
const isGlobal = computed(() => activeConv.value.scope === 'global');
const isProject = (id: string) => activeConv.value.scope === 'project' && (activeConv.value as any).projectId === id;
const isDm = (partnerId: string) => activeConv.value.scope === 'dm' && (activeConv.value as any).dmPartnerId === partnerId;

const convLabel = computed(() => {
  if (activeConv.value.scope === 'global') return 'Global Chat';
  if (activeConv.value.scope === 'project') {
    const proj = projectList.value.find(p => p.id === (activeConv.value as any).projectId);
    return proj?.name || 'Project Chat';
  }
  const conv = realtime.dmConversations.value.find(c => c.partnerId === (activeConv.value as any).dmPartnerId);
  return conv?.partnerName || 'Tin nhắn riêng';
});

const messages = computed(() => {
  if (activeConv.value.scope === 'global') return realtime.globalMessages.value;
  if (activeConv.value.scope === 'project') return realtime.getProjectMessages((activeConv.value as any).projectId);
  return realtime.getDmMessages((activeConv.value as any).dmPartnerId);
});

const mentionCandidates = computed(() => {
  if (activeConv.value.scope === 'global') return realtime.getMentionCandidates('global');
  if (activeConv.value.scope === 'project') return realtime.getMentionCandidates('project', (activeConv.value as any).projectId);
  return []; // No @mentions in DM
});

const filteredMentionCandidates = computed(() => {
  if (!mentionContext.value) return [];
  const query = mentionContext.value.query.toLowerCase();
  return mentionCandidates.value
    .filter(c => !query || c.mentionToken.toLowerCase().includes(query) || c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query))
    .slice(0, 8);
});

const showMentionDropdown = computed(() => !!mentionContext.value && filteredMentionCandidates.value.length > 0);

const canSend = computed(() => {
  if (!draft.value.trim()) return false;
  if (activeConv.value.scope === 'project' && !(activeConv.value as any).projectId) return false;
  if (activeConv.value.scope === 'dm' && !(activeConv.value as any).dmPartnerId) return false;
  return true;
});

const formatTime = (value: number | string) =>
  new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

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
    if (activeConv.value.scope === 'global') {
      await Promise.all([
        realtime.fetchChatMessages('global'),
        realtime.fetchMentionCandidates('global')
      ]);
    } else if (activeConv.value.scope === 'project') {
      const pid = (activeConv.value as any).projectId;
      await Promise.all([
        realtime.fetchChatMessages('project', pid),
        realtime.fetchMentionCandidates('project', pid)
      ]);
    } else {
      const partnerId = (activeConv.value as any).dmPartnerId;
      await realtime.fetchChatMessages('dm', undefined, partnerId);
    }
    scrollToBottom();
  } finally {
    loading.value = false;
  }
};

const switchTo = async (conv: ActiveConv) => {
  activeConv.value = conv;
  mentionContext.value = null;
  activeMentionIndex.value = 0;
  draft.value = "";
  showNewDmDropdown.value = false;
  await loadMessages();
};

const startDm = async (user: { id: string; name: string }) => {
  showNewDmDropdown.value = false;
  dmSearchQuery.value = "";
  // Add to DM conversations list locally if not there
  if (!realtime.dmConversations.value.find(c => c.partnerId === user.id)) {
    realtime.dmConversations.value = [
      { partnerId: user.id, partnerName: user.name, partnerEmail: '', lastMessage: '', lastSenderName: '', lastAt: Date.now() },
      ...realtime.dmConversations.value
    ];
  }
  await switchTo({ scope: 'dm', dmPartnerId: user.id });
};

const handleDmSearchBlur = () => {
  setTimeout(() => { showNewDmDropdown.value = false; }, 150);
};

// Watch chatFocus from useChatPanel to auto-switch context
watch(
  () => chatPanel.focus.value,
  async (focus) => {
    if (!focus || !props.show) return;
    let conv: ActiveConv;
    if (focus.scope === 'project' && (focus as any).projectId) {
      conv = { scope: 'project', projectId: (focus as any).projectId };
    } else if (focus.scope === 'dm' && (focus as any).dmPartnerId) {
      conv = { scope: 'dm', dmPartnerId: (focus as any).dmPartnerId };
    } else {
      conv = { scope: 'global' };
    }
    await switchTo(conv);
    chatPanel.focus.value = null; // clear after use
  }
);

// When panel opens, load current conv + dm conversations
watch(
  () => props.show,
  async (isOpen) => {
    if (!isOpen) return;
    // Apply pending focus
    const focus = chatPanel.focus.value;
    if (focus) {
      let conv: ActiveConv;
      if (focus.scope === 'project' && (focus as any).projectId) {
        conv = { scope: 'project', projectId: (focus as any).projectId };
      } else if (focus.scope === 'dm' && (focus as any).dmPartnerId) {
        conv = { scope: 'dm', dmPartnerId: (focus as any).dmPartnerId };
      } else {
        conv = { scope: 'global' };
      }
      activeConv.value = conv;
      chatPanel.focus.value = null;
    }
    await Promise.all([loadMessages(), realtime.fetchDmConversations()]);
    // Load global mention candidates for DM new picker
    if (allMentionCandidates.value.length === 0) {
      realtime.fetchMentionCandidates('global').catch(() => {});
    }
  },
  { immediate: true }
);

watch(() => messages.value.length, () => {
  if (!props.show) return;
  scrollToBottom();
});

// Mention helpers
const detectMentionContext = (value: string, caret: number) => {
  const beforeCaret = value.slice(0, caret);
  const matched = /(^|[\s])@([a-zA-Z0-9._-]{0,64})$/.exec(beforeCaret);
  if (!matched) return null;
  const query = matched[2] || "";
  const start = caret - query.length - 1;
  return { start, end: caret, query };
};

const refreshMentionContext = () => {
  const input = draftInputRef.value;
  if (!input) { mentionContext.value = null; return; }
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

const handleDraftInput = () => { refreshMentionContext(); };

const handleDraftKeydown = (event: KeyboardEvent) => {
  if (showMentionDropdown.value) {
    if (event.key === "ArrowDown") { event.preventDefault(); activeMentionIndex.value = (activeMentionIndex.value + 1) % filteredMentionCandidates.value.length; return; }
    if (event.key === "ArrowUp") { event.preventDefault(); activeMentionIndex.value = (activeMentionIndex.value - 1 + filteredMentionCandidates.value.length) % filteredMentionCandidates.value.length; return; }
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); const c = filteredMentionCandidates.value[activeMentionIndex.value]; if (c) selectMentionCandidate(c); return; }
    if (event.key === "Escape") { mentionContext.value = null; activeMentionIndex.value = 0; return; }
  }
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); }
};

const captureSnapshot = () => {
  if (!process.client) return undefined;
  const canvas = document.getElementById("plan-view-root")?.querySelector("canvas") as HTMLCanvasElement | null;
  if (!canvas) return undefined;
  try { return canvas.toDataURL("image/jpeg", 0.7); } catch { return undefined; }
};

const extractMentionTokens = (content: string) => {
  const matched = content.match(/@([a-zA-Z0-9._-]{2,64})/g) || [];
  return matched.map(item => item.slice(1).toLowerCase());
};

const jumpToDeepLink = (deepLink?: { drawingId?: string; taskId?: string; pinX?: number; pinY?: number; zoom?: number }) => {
  if (!deepLink?.drawingId) return;
  const matchedNode = getNodeById(deepLink.drawingId);
  if (matchedNode) {
    selected.value = { id: matchedNode.id, name: matchedNode.name, type: matchedNode.type, projectId: matchedNode.projectId, projectRole: matchedNode.projectRole, canManageStructure: matchedNode.canManageStructure, drawingCode: matchedNode.drawingCode, versionIndex: matchedNode.versionIndex };
  } else {
    selected.value = { id: deepLink.drawingId, name: "Drawing", type: "drawing" };
  }
  setDeepLinkFocus({ drawingId: deepLink.drawingId, taskId: deepLink.taskId, pinX: deepLink.pinX, pinY: deepLink.pinY, zoom: deepLink.zoom });
  if (route.path !== "/") void navigateTo("/");
};

const send = async () => {
  if (!canSend.value) return;
  const safeContent = draft.value.trim();
  if (!safeContent) return;
  sending.value = true;
  try {
    const hasMention = activeConv.value.scope !== 'dm' && extractMentionTokens(safeContent).length > 0;
    const snapshotDataUrl = hasMention ? captureSnapshot() : undefined;
    const deepLink = planViewState.value?.drawingId
      ? { drawingId: planViewState.value.drawingId, taskId: planViewState.value.taskId, pinX: planViewState.value.centerX, pinY: planViewState.value.centerY, zoom: planViewState.value.zoom }
      : undefined;

    await realtime.sendChatMessage({
      scope: activeConv.value.scope,
      projectId: activeConv.value.scope === 'project' ? (activeConv.value as any).projectId : undefined,
      dmPartnerId: activeConv.value.scope === 'dm' ? (activeConv.value as any).dmPartnerId : undefined,
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
