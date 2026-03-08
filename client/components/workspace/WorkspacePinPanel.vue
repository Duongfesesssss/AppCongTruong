<template>
  <Teleport to="body">
    <Transition name="pin-panel">
      <div v-if="pinPanel.open.value" class="fixed inset-0 z-50 flex justify-end">
        <div class="absolute inset-0 bg-black/30" @click="pinPanel.open.value = false" />
        <div class="relative z-10 flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span class="text-sm font-semibold text-slate-900">Workspace Pins</span>
              <span v-if="activeProjectId" class="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                {{ filteredPins.length }}
              </span>
            </div>
            <button class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" @click="pinPanel.open.value = false">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body: sidebar + pin list -->
          <div class="flex min-h-0 flex-1">
            <!-- Sidebar: projects -->
            <div class="flex w-[150px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-slate-100 bg-slate-50 p-2">
              <p class="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Projects</p>
              <button
                v-for="proj in projects"
                :key="proj.id"
                class="truncate rounded px-2 py-1.5 text-left text-xs transition-colors"
                :class="activeProjectId === proj.id ? 'bg-brand-100 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100'"
                @click="selectProject(proj.id)"
              >
                {{ proj.name }}
              </button>
              <div v-if="projects.length === 0" class="px-2 py-3 text-[11px] text-slate-400">
                Chưa có project
              </div>
            </div>

            <!-- Right: filters + pin list -->
            <div class="flex min-w-0 flex-1 flex-col">
              <!-- Filters bar (shown when project selected) -->
              <div v-if="activeProjectId && !loading" class="border-b border-slate-100 px-3 py-2 space-y-2">
                <!-- Search -->
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Tìm tên, mã pin, mô tả..."
                  class="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:border-brand-400 focus:outline-none"
                />
                <!-- Filter row -->
                <div class="flex gap-1.5">
                  <select v-model="filterStatus" class="flex-1 rounded border border-slate-200 px-1.5 py-1 text-[11px] text-slate-600 focus:border-brand-400 focus:outline-none">
                    <option value="">Trạng thái</option>
                    <option value="instruction">Hướng dẫn</option>
                    <option value="rfi">RFI</option>
                    <option value="resolved">Đã hoàn thành</option>
                    <option value="approved">QA kiểm soát</option>
                    <option value="open">Mở</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="blocked">Bị chặn</option>
                    <option value="done">Xong</option>
                  </select>
                  <select v-model="filterCategory" class="flex-1 rounded border border-slate-200 px-1.5 py-1 text-[11px] text-slate-600 focus:border-brand-400 focus:outline-none">
                    <option value="">Loại</option>
                    <option value="quality">Chất lượng</option>
                    <option value="safety">An toàn</option>
                    <option value="progress">Tiến độ</option>
                    <option value="fire_protection">Chống cháy</option>
                    <option value="other">Khác</option>
                  </select>
                  <select v-model="filterCreatedBy" class="flex-1 rounded border border-slate-200 px-1.5 py-1 text-[11px] text-slate-600 focus:border-brand-400 focus:outline-none">
                    <option value="">Người tạo</option>
                    <option v-for="c in uniqueCreators" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <!-- Clear filters -->
                <button
                  v-if="hasActiveFilters"
                  class="text-[10px] text-brand-600 hover:text-brand-700"
                  @click="clearFilters"
                >
                  Xóa bộ lọc
                </button>
              </div>

              <!-- Pin list area -->
              <div class="flex-1 overflow-y-auto p-3">
                <!-- No project selected -->
                <div v-if="!activeProjectId" class="py-10 text-center text-sm text-slate-400">
                  Chọn project để xem pins
                </div>

                <!-- Loading -->
                <div v-else-if="loading" class="py-10 text-center text-sm text-slate-400">
                  Đang tải...
                </div>

                <!-- No results -->
                <div v-else-if="Object.keys(filteredPinsByDrawing).length === 0" class="py-10 text-center text-sm text-slate-400">
                  {{ hasActiveFilters ? 'Không có pin phù hợp' : 'Chưa có pin nào' }}
                </div>

                <!-- Grouped by drawing -->
                <div v-else class="flex flex-col gap-3">
                  <div v-for="(group, drawingId) in filteredPinsByDrawing" :key="drawingId">
                    <!-- Drawing header -->
                    <div class="mb-1 flex items-center gap-1.5">
                      <svg class="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span class="truncate text-[11px] font-semibold text-slate-500">
                        {{ getNodeById(drawingId as string)?.name || drawingId }}
                      </span>
                      <span class="ml-auto shrink-0 text-[10px] text-slate-400">{{ group.length }}</span>
                    </div>

                    <!-- Pin cards -->
                    <button
                      v-for="pin in group"
                      :key="pin._id"
                      class="mb-1 flex w-full items-start gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-left hover:border-brand-200 hover:bg-brand-50/40 transition-colors"
                      @click="goToPin(pin)"
                    >
                      <span
                        class="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        :class="statusClass(pin.status)"
                      >
                        {{ statusLabel(pin.status) }}
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-xs font-medium text-slate-800">
                          {{ pin.pinCode }}
                          <span v-if="pin.pinName" class="font-normal text-slate-500"> — {{ pin.pinName }}</span>
                        </p>
                        <p v-if="pin.description" class="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{{ pin.description }}</p>
                        <p v-if="pin.createdBy" class="mt-0.5 text-[10px] text-slate-300">{{ creatorName(pin.createdBy) }}</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { usePinPanel } from "~/composables/state/usePinPanel";
import { useProjectTree } from "~/composables/api/useProjectTree";
import { useSelectedNode } from "~/composables/state/useSelectedNode";
import { useDeepLinkFocus } from "~/composables/state/useDeepLinkFocus";
import { useApi } from "~/composables/api/useApi";

const pinPanel = usePinPanel();
const { nodes, getNodeById } = useProjectTree();
const selected = useSelectedNode();
const { setDeepLinkFocus } = useDeepLinkFocus();
const api = useApi();
const route = useRoute();

const activeProjectId = ref<string | null>(null);
const pins = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const filterStatus = ref("");
const filterCategory = ref("");
const filterCreatedBy = ref("");

// usersMap built from project members (fetched alongside pins)
const usersMap = ref<Map<string, { name: string }>>(new Map());

const projects = computed(() =>
  nodes.value.filter((n) => n.type === "project")
);

const hasActiveFilters = computed(() =>
  !!(searchQuery.value || filterStatus.value || filterCategory.value || filterCreatedBy.value)
);

const uniqueCreators = computed(() => {
  const map = new Map<string, { id: string; name: string }>();
  for (const pin of pins.value) {
    if (pin.createdBy && !map.has(String(pin.createdBy))) {
      const u = usersMap.value.get(String(pin.createdBy));
      if (u) map.set(String(pin.createdBy), { id: String(pin.createdBy), name: u.name });
    }
  }
  return Array.from(map.values());
});

const filteredPins = computed(() => {
  let result = pins.value;
  if (filterStatus.value) result = result.filter((p) => p.status === filterStatus.value);
  if (filterCategory.value) result = result.filter((p) => p.category === filterCategory.value);
  if (filterCreatedBy.value) result = result.filter((p) => String(p.createdBy) === filterCreatedBy.value);
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((p) =>
      (p.pinName || "").toLowerCase().includes(q) ||
      (p.pinCode || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.roomName || "").toLowerCase().includes(q)
    );
  }
  return result;
});

const filteredPinsByDrawing = computed(() => {
  const groups: Record<string, any[]> = {};
  for (const pin of filteredPins.value) {
    const key = pin.drawingId?.toString() || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(pin);
  }
  return groups;
});

const creatorName = (userId: string) => {
  const u = usersMap.value.get(String(userId));
  return u?.name || "";
};

const clearFilters = () => {
  searchQuery.value = "";
  filterStatus.value = "";
  filterCategory.value = "";
  filterCreatedBy.value = "";
};

const selectProject = async (projectId: string) => {
  if (activeProjectId.value === projectId) return;
  activeProjectId.value = projectId;
  clearFilters();
  loading.value = true;
  try {
    const [pinsData, projectData] = await Promise.all([
      api.get<any[]>(`/tasks?projectId=${projectId}&limit=500`),
      api.get<any>(`/projects/${projectId}`)
    ]);
    pins.value = pinsData || [];
    // Build usersMap from project members
    const map = new Map<string, { name: string }>();
    const members: any[] = projectData?.members || [];
    for (const m of members) {
      if (m.userId) {
        map.set(String(m.userId), { name: m.userName || m.userEmail || "Unknown" });
      }
    }
    usersMap.value = map;
  } catch {
    pins.value = [];
  } finally {
    loading.value = false;
  }
};

const goToPin = (pin: any) => {
  pinPanel.open.value = false;
  const drawingId = pin.drawingId?.toString() || pin.drawingId;
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
    selected.value = { id: drawingId, name: "Drawing", type: "drawing" };
  }
  setDeepLinkFocus({
    drawingId,
    taskId: pin._id?.toString() || pin._id,
    pinX: pin.pinX,
    pinY: pin.pinY
  });
  if (route.path !== "/") void navigateTo("/");
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    open: "Open",
    in_progress: "WIP",
    blocked: "Block",
    done: "Done",
    resolved: "Res",
    approved: "OK",
    instruction: "Inst",
    rfi: "RFI"
  };
  return map[status] || status;
};

const statusClass = (status: string) => {
  const map: Record<string, string> = {
    open: "bg-slate-100 text-slate-600",
    in_progress: "bg-blue-100 text-blue-700",
    blocked: "bg-red-100 text-red-700",
    done: "bg-green-100 text-green-700",
    resolved: "bg-emerald-100 text-emerald-700",
    approved: "bg-teal-100 text-teal-700",
    instruction: "bg-purple-100 text-purple-700",
    rfi: "bg-orange-100 text-orange-700"
  };
  return map[status] || "bg-slate-100 text-slate-600";
};

// Reset khi đóng panel
watch(
  () => pinPanel.open.value,
  (isOpen) => {
    if (!isOpen) {
      activeProjectId.value = null;
      pins.value = [];
      usersMap.value = new Map();
      clearFilters();
    }
  }
);
</script>

<style scoped>
.pin-panel-enter-active,
.pin-panel-leave-active {
  transition: opacity 0.2s ease;
}
.pin-panel-enter-active > div:last-child,
.pin-panel-leave-active > div:last-child {
  transition: transform 0.25s ease;
}
.pin-panel-enter-from,
.pin-panel-leave-to {
  opacity: 0;
}
.pin-panel-enter-from > div:last-child,
.pin-panel-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
