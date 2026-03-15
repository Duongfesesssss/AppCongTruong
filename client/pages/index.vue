<template>
  <div class="grid gap-6">
    <!-- Selection Info -->
    <section class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div class="min-w-0 flex-1">
          <p class="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">Đang chọn</p>
          <h2 class="truncate text-base sm:text-lg font-semibold text-slate-900">
            {{ selected?.name || "Chưa chọn" }}
          </h2>
        </div>
        <span class="shrink-0 rounded-full bg-slate-100 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium uppercase text-slate-500">
          {{ selected?.type || "-" }}
        </span>
      </div>
    </section>

    <!-- Drawing View -->
    <template v-if="selected?.type === 'drawing'">
      <section class="relative z-0 mb-4 rounded-xl border border-slate-200 bg-white shadow-sm sm:mb-6 sm:rounded-2xl">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 sm:px-4 py-2 sm:py-3">
          <div class="flex min-w-0 items-center gap-2">
            <h3 class="text-sm sm:text-base font-semibold text-slate-900">Bản vẽ</h3>
          </div>
          <div class="flex items-center gap-1.5 sm:gap-2">
            <!-- Danh sách phiên bản A / B / C gần nút tải -->
            <template v-if="drawingVersions.length > 1">
              <div class="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  v-for="v in drawingVersions"
                  :key="v._id"
                  class="flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs font-bold transition-colors"
                  :class="v._id === activeDrawingId
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'"
                  :title="`Phiên bản ${versionIndexToLetter(v.versionIndex)}${v.isLatestVersion ? ' (mới nhất)' : ''}`"
                  :disabled="loading"
                  @click="switchToVersion(v._id)"
                >
                  {{ versionIndexToLetter(v.versionIndex) }}
                </button>
              </div>
              <div class="h-5 w-px bg-slate-200" />
            </template>
            <!-- Nút tải PDF bản vẽ -->
            <button
              v-if="(drawing as any)?.fileType !== '3d'"
              class="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              :disabled="downloadingPdf || loading"
              @click="downloadDrawingPdf"
            >
              <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {{ downloadingPdf ? "Đang tải..." : "Tải PDF" }}
            </button>
            <!-- Nút tải tất cả ảnh trong bản vẽ -->
            <button
              class="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
              :disabled="downloadingDrawingImages || loading"
              @click="downloadDrawingImages"
            >
              <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v-8m0 8l-3-3m3 3l3-3M5 20h14" />
              </svg>
              {{ downloadingDrawingImages ? "Đang tải..." : "Tải tất cả ảnh" }}
            </button>
            <!-- Nút bỏ chọn task -->
            <button
              v-if="selectedTask"
              class="flex items-center gap-1 rounded-lg border border-slate-200 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-500 hover:bg-slate-100"
              @click="selectedTask = null"
            >
              <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span class="hidden xs:inline">Bỏ chọn</span>
            </button>
            <!-- Nút thêm Task (bật chế độ đặt pin) -->
            <button
              v-if="canManageTasks"
              class="flex items-center gap-1 rounded-lg border px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium"
              :class="placingPin
                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100'"
              @click="togglePlacement"
            >
              <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="!placingPin" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {{ placingPin ? "Đặt pin..." : "Thêm Task" }}
            </button>
          </div>
        </div>
        <div
          v-if="drawingVersions.length > 1"
          class="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2 sm:px-4"
        >
          <select
            v-model="compareDrawingId"
            class="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 sm:text-xs"
          >
            <option value="">Không so sánh</option>
            <option v-for="version in compareCandidates" :key="version._id" :value="version._id">
              So sánh với phiên bản {{ versionIndexToLetter(version.versionIndex) }}
            </option>
          </select>
          <select
            v-model="compareBlendMode"
            class="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 sm:text-xs"
            :disabled="!compareDrawingId"
          >
            <option value="difference">Difference</option>
            <option value="multiply">Multiply</option>
            <option value="normal">Normal</option>
          </select>
          <label class="flex items-center gap-2 text-[11px] text-slate-600 sm:text-xs">
            Opacity
            <input
              v-model.number="compareOpacityPercent"
              type="range"
              min="10"
              max="100"
              :disabled="!compareDrawingId"
            />
            {{ compareOpacityPercent }}%
          </label>
        </div>
        <IfcViewer
          v-if="(drawing as any)?.fileType === '3d'"
          :drawing="(drawing as any)"
          :loading="loading"
          :error="error"
        />
        <PlanViewer
          v-else
          :drawing="drawing"
          :compare-drawing-id="compareDrawingId || undefined"
          :compare-blend-mode="compareBlendMode"
          :compare-opacity="compareOpacity"
          :pins="pins"
          :zones="zones"
          :loading="loading"
          :error="error"
          :placing-pin="placingPin"
          :selected-pin-id="selectedTask?._id"
          :can-edit-pins="canManageTasks"
          @pin-click="handlePinClick"
          @zone-click="handleZoneClick"
          @place-pin="handlePlacePin"
          @pin-move="handlePinMove"
          @view-state="handleViewState"
          @cancel-place="placingPin = false"
        />
      </section>

      <!-- Layout 2 cột: Task List + Task Detail -->
      <div class="relative z-10 grid gap-4 sm:gap-6" :class="selectedTask ? 'lg:grid-cols-2' : ''">
        <!-- Tasks List -->
        <section class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <h3 class="text-sm sm:text-base font-semibold text-slate-900">Danh sách Task ({{ pins.length }})</h3>
          <p v-if="pins.length === 0" class="mt-3 text-center text-xs sm:text-sm text-slate-400">
            {{ canManageTasks
              ? 'Chưa có task nào. Bấm "Thêm Task" rồi nhấn vào bản vẽ để tạo.'
              : 'Chưa có task nào trong bản vẽ này.' }}
          </p>
          <div v-else class="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
            <div
              v-for="pin in pins"
              :key="pin._id"
              class="flex items-center gap-2 sm:gap-3 rounded-lg border border-slate-100 p-2 sm:p-3 hover:bg-slate-50 cursor-pointer transition-colors"
              :class="{ 'ring-2 ring-brand-500 bg-brand-50/30': selectedTask?._id === pin._id }"
              @click="selectTask(pin)"
            >
              <div
                class="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold text-white"
                :class="statusColor(pin.status)"
              >
                {{ pin.pinCode?.slice(-2) || '?' }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm sm:text-base font-medium text-slate-800">{{ pin.pinName || pin.pinCode }}</p>
                <p class="text-[10px] sm:text-xs text-slate-400">{{ pin.roomName || 'Không có phòng' }} · {{ pin.category }}</p>
              </div>
              <div class="flex items-center gap-1.5 sm:gap-2">
                <!-- Badge ảnh -->
                <span
                  v-if="pin.photoCount"
                  class="flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
                  title="Số ảnh"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ pin.photoCount }}
                </span>
                <span
                  class="shrink-0 rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium uppercase"
                  :class="statusBadge(pin.status)"
                >
                  {{ statusLabel(pin.status) }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Task Detail (hiển thị bên cạnh khi chọn task) -->
        <section v-if="selectedTask" class="min-w-0">
          <TaskDetail
            :task-id="selectedTask._id || selectedTask.id"
            :task-data="selectedTask"
            :can-delete-photo="canManageTasks"
            :can-edit-task="canManageTasks"
            :is-admin="isProjectAdmin"
            @updated="reloadTasksOnly"
          />
        </section>
      </div>
    </template>

    <!-- Task Detail View (khi chọn từ tree) -->
    <template v-else-if="selected?.type === 'task'">
      <TaskDetail
        :task-id="selected.id"
        :can-delete-photo="canManageTasks"
        :can-edit-task="canManageTasks"
        :is-admin="isProjectAdmin"
        @updated="reloadTasksOnly"
      />
    </template>

    <!-- Empty State -->
    <template v-else>
      <section class="rounded-xl sm:rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 sm:p-8 text-center">
        <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <h3 class="mt-4 font-semibold text-slate-700">Chọn một Drawing để bắt đầu</h3>
        <p class="mt-1 text-xs sm:text-sm text-slate-400">
          Sử dụng cây thư mục <span class="lg:hidden">ở menu trên cùng</span><span class="hidden lg:inline">bên trái</span> để chọn Drawing và quản lý Task.
        </p>
      </section>
    </template>

    <!-- Task Creator Modal (nhận toạ độ từ bản vẽ) -->
    <CreateForm
      :show="showTaskCreator"
      type="task"
      :parent-id="activeDrawingId || selected?.id"
      :initial-pin-x="pendingPinCoords?.pinX"
      :initial-pin-y="pendingPinCoords?.pinY"
      @close="closeTaskCreator"
      @created="handleTaskCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { useSelectedNode, type SelectedNode } from "~/composables/state/useSelectedNode";
import {
  isOfflineQueuedResponse,
  type ApiOfflineQueuedResult,
  useApi
} from "~/composables/api/useApi";
import { useOfflineSync } from "~/composables/state/useOfflineSync";
import { usePlanViewState } from "~/composables/state/usePlanViewState";
import { useToast } from "~/composables/state/useToast";
import { useDeepLinkFocus } from "~/composables/state/useDeepLinkFocus";

const selected = useSelectedNode();
const api = useApi();
const offlineSync = useOfflineSync();
const toast = useToast();
const planViewState = usePlanViewState();
const { pending: pendingDeepLink } = useDeepLinkFocus();
const config = useRuntimeConfig();
const token = useState<string | null>("auth-token", () => null);

const drawing = ref<Record<string, unknown> | null>(null);
const pins = ref<any[]>([]);
const zones = ref<any[]>([]);
const drawingVersions = ref<any[]>([]);
const activeDrawingId = ref<string>("");
const compareDrawingId = ref<string>("");
const compareBlendMode = ref<"difference" | "multiply" | "normal">("difference");
const compareOpacityPercent = ref(55);
const selectedTask = ref<any>(null);
const downloadingDrawingImages = ref(false);
const downloadingPdf = ref(false);
const pendingTaskSelectionId = ref<string>("");

const loading = ref(false);
const error = ref("");
const canManageTasks = computed(() => {
  return selected.value?.canManageTasks ?? false;
});
const isProjectAdmin = computed(() => selected.value?.projectRole === "admin");
const compareOpacity = computed(() => compareOpacityPercent.value / 100);
const compareCandidates = computed(() =>
  drawingVersions.value.filter((item) => item?._id && item._id !== activeDrawingId.value)
);

// Chuyển versionIndex số → chữ cái: 1→A, 2→B, 26→Z, 27→AA
const versionIndexToLetter = (index: number): string => {
  if (!index || index <= 0) return String(index);
  const letters: string[] = [];
  let n = index;
  while (n > 0) {
    n--;
    letters.unshift(String.fromCharCode(65 + (n % 26)));
    n = Math.floor(n / 26);
  }
  return letters.join("");
};

const switchToVersion = async (versionId: string) => {
  if (versionId === activeDrawingId.value) return;
  activeDrawingId.value = versionId;
  if (compareDrawingId.value === versionId) compareDrawingId.value = "";
  selectedTask.value = null;
  placingPin.value = false;
  await loadDrawingDataById(versionId);
};

// Pin placement
const placingPin = ref(false);
const pendingPinCoords = ref<{ pinX: number; pinY: number } | null>(null);
const showTaskCreator = ref(false);

type OfflineTaskDraft = {
  drawingId?: string;
  pinName?: string;
  roomName?: string;
  description?: string;
  status?: string;
  category?: string;
  pinX?: number;
  pinY?: number;
};

type OfflineTaskCreatedPayload = ApiOfflineQueuedResult & {
  __offlineTaskDraft?: OfflineTaskDraft;
};

const OFFLINE_TASK_ID_MAP_STORAGE_KEY = "offline-task-id-map-v1";

const readOfflineTaskIdMap = (): Record<string, string> => {
  if (!process.client) return {};
  try {
    const raw = localStorage.getItem(OFFLINE_TASK_ID_MAP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

const syncSelectedTaskWithPins = (nextPins: any[]) => {
  if (!selectedTask.value) return;

  const selectedTaskId = selectedTask.value._id || selectedTask.value.id;
  if (typeof selectedTaskId !== "string") {
    selectedTask.value = null;
    return;
  }

  let mappedTaskId: string | undefined;
  if (selectedTaskId.startsWith("offline-")) {
    mappedTaskId = readOfflineTaskIdMap()[selectedTaskId];
  }

  const matchedTask = nextPins.find((pin) => {
    const currentPinId = pin?._id || pin?.id;
    return currentPinId === selectedTaskId || (mappedTaskId && currentPinId === mappedTaskId);
  });

  selectedTask.value = matchedTask || null;
};

const resolveTaskById = (taskId: string) => {
  return pins.value.find((pin) => {
    const currentPinId = pin?._id || pin?.id;
    return currentPinId === taskId;
  });
};

const tryApplyPendingTaskSelection = () => {
  if (!pendingTaskSelectionId.value) return;
  if (selected.value?.type !== "drawing") return;

  const matchedTask = resolveTaskById(pendingTaskSelectionId.value);
  if (!matchedTask) return;

  selectedTask.value = matchedTask;
  pendingTaskSelectionId.value = "";
};

// Load drawing data theo drawing id đang active (hỗ trợ version dropdown)
const loadDrawingDataById = async (drawingId: string) => {
  if (!drawingId) {
    drawing.value = null;
    pins.value = [];
    zones.value = [];
    drawingVersions.value = [];
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const [drawingData, tasksData, zonesData, versionsData] = await Promise.all([
      api.get<Record<string, unknown>>(`/drawings/${drawingId}`),
      api.get<any[]>(`/tasks?drawingId=${drawingId}`),
      api.get<any[]>(`/drawings/${drawingId}/zones`),
      api.get<any[]>(`/drawings/${drawingId}/versions`)
    ]);
    drawing.value = drawingData;
    pins.value = tasksData || [];
    zones.value = zonesData || [];
    drawingVersions.value = versionsData || [];
    if (!activeDrawingId.value && drawingId) {
      activeDrawingId.value = drawingId;
    }
    const hasActiveVersion = drawingVersions.value.some((item) => item?._id === activeDrawingId.value);
    if (!hasActiveVersion && drawingVersions.value.length > 0) {
      activeDrawingId.value = drawingVersions.value[0]._id;
    }
    if (compareDrawingId.value && compareDrawingId.value === activeDrawingId.value) {
      compareDrawingId.value = "";
    }
    if (compareDrawingId.value && !drawingVersions.value.some((item) => item?._id === compareDrawingId.value)) {
      compareDrawingId.value = "";
    }
    tryApplyPendingTaskSelection();
    syncSelectedTaskWithPins(pins.value);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
};

const loadDrawingData = async (node: SelectedNode | null) => {
  if (!node || node.type !== "drawing") {
    drawing.value = null;
    pins.value = [];
    zones.value = [];
    drawingVersions.value = [];
    activeDrawingId.value = "";
    compareDrawingId.value = "";
    planViewState.value = { updatedAt: Date.now() };
    return;
  }
  activeDrawingId.value = node.id;
  await loadDrawingDataById(node.id);
};

const reloadDrawingData = async () => {
  if (selected.value?.type !== "drawing" || !activeDrawingId.value) return;
  await loadDrawingDataById(activeDrawingId.value);
};

const handleDrawingVersionChange = async () => {
  if (!activeDrawingId.value) return;
  if (compareDrawingId.value === activeDrawingId.value) {
    compareDrawingId.value = "";
  }
  selectedTask.value = null;
  placingPin.value = false;
  await loadDrawingDataById(activeDrawingId.value);
};

// Reload chỉ tasks + zones (không load lại drawing → tránh reload PDF)
const reloadTasksOnly = async () => {
  if (selected.value?.type !== "drawing" || !activeDrawingId.value) return;
  try {
    const [tasksData, zonesData] = await Promise.all([
      api.get<any[]>(`/tasks?drawingId=${activeDrawingId.value}`),
      api.get<any[]>(`/drawings/${activeDrawingId.value}/zones`)
    ]);
    pins.value = tasksData || [];
    zones.value = zonesData || [];
    tryApplyPendingTaskSelection();
    syncSelectedTaskWithPins(pins.value);
  } catch {
    // Lỗi nhẹ, không cần hiển thị
  }
};

const downloadDrawingImages = async () => {
  if (selected.value?.type !== "drawing" || !activeDrawingId.value) {
    toast.push("Vui lòng chọn bản vẽ", "info");
    return;
  }

  downloadingDrawingImages.value = true;
  try {
    const baseUrl = config.public.apiBase.startsWith("http")
      ? config.public.apiBase
      : `${window.location.origin}${config.public.apiBase}`;

    const url = new URL(`${baseUrl}/reports/export-images`);
    url.searchParams.set("drawingId", activeDrawingId.value);
    if (token.value) {
      url.searchParams.set("token", token.value);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      let message = "Không thể tải ảnh";
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          message = errorData.error.message;
        }
      } catch {
        // Ignore JSON parse error
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const safeName = (drawing.value?.name || selected.value?.name || "drawing")
      .toString()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `anh-${safeName || "drawing"}-${Date.now()}.zip`;

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    toast.push("Đang tải ảnh của bản vẽ...", "success");
  } catch (err) {
    toast.push((err as Error).message || "Lỗi khi tải ảnh", "error");
  } finally {
    downloadingDrawingImages.value = false;
  }
};

const downloadDrawingPdf = async () => {
  if (!activeDrawingId.value) {
    toast.push("Vui lòng chọn bản vẽ", "info");
    return;
  }
  downloadingPdf.value = true;
  try {
    const baseUrl = config.public.apiBase.startsWith("http")
      ? config.public.apiBase
      : `${window.location.origin}${config.public.apiBase}`;

    const url = new URL(`${baseUrl}/drawings/${activeDrawingId.value}/file`);
    url.searchParams.set("download", "1");
    if (token.value) url.searchParams.set("token", token.value);

    const response = await fetch(url.toString(), { credentials: "include" });
    if (!response.ok) throw new Error("Không thể tải file bản vẽ");

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const nameMatch = disposition.match(/filename="?([^"]+)"?/);
    const fileName = nameMatch?.[1] || `${drawing.value?.name || "banve"}.pdf`;

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    toast.push("Đã tải xuống bản vẽ PDF", "success");
  } catch (err) {
    toast.push((err as Error).message || "Lỗi khi tải PDF", "error");
  } finally {
    downloadingPdf.value = false;
  }
};

// === Pin Placement Flow ===
const togglePlacement = () => {
  if (!canManageTasks.value) {
    toast.push("Tài khoản kỹ thuật viên không có quyền quản lý task/pin", "info");
    return;
  }
  if (placingPin.value) {
    placingPin.value = false;
  } else {
    placingPin.value = true;
    selectedTask.value = null; // Bỏ chọn task khi đặt pin
  }
};

const handlePlacePin = (coords: { pinX: number; pinY: number }) => {
  if (!canManageTasks.value) return;
  // Nhận toạ độ từ PlanViewer → mở form tạo task
  pendingPinCoords.value = coords;
  showTaskCreator.value = true;
  placingPin.value = false;
};

const closeTaskCreator = () => {
  showTaskCreator.value = false;
  pendingPinCoords.value = null;
};

const handleTaskCreated = async (createdData: unknown) => {
  const fallbackPinX = pendingPinCoords.value?.pinX ?? 0.5;
  const fallbackPinY = pendingPinCoords.value?.pinY ?? 0.5;
  showTaskCreator.value = false;
  pendingPinCoords.value = null;
  placingPin.value = false;
  if (isOfflineQueuedResponse(createdData)) {
    const queuedPayload = createdData as OfflineTaskCreatedPayload;
    const draft = queuedPayload.__offlineTaskDraft;
    if (draft && selected.value?.type === "drawing") {
      const offlineTaskId = `offline-${queuedPayload.queueId}`;
      const alreadyExists = pins.value.some((pin) => (pin._id || pin.id) === offlineTaskId);
      if (!alreadyExists) {
        const offlineTask = {
          _id: offlineTaskId,
          drawingId: draft.drawingId || activeDrawingId.value || selected.value.id,
          pinName: draft.pinName || "",
          roomName: draft.roomName || "",
          description: draft.description || "",
          status: draft.status || "instruction",
          category: draft.category || "quality",
          pinX: typeof draft.pinX === "number" ? draft.pinX : fallbackPinX,
          pinY: typeof draft.pinY === "number" ? draft.pinY : fallbackPinY,
          pinCode: `CHO-DONG-BO-${queuedPayload.queueId.slice(-4).toUpperCase()}`,
          photoCount: 0,
          _offlineQueued: true
        };
        pins.value = [offlineTask, ...pins.value];
        selectedTask.value = offlineTask;
      }
    }
    toast.push("Task đã lưu tạm và mở được để làm việc offline. Hệ thống sẽ đồng bộ khi có mạng.", "info");
    return;
  }
  await reloadTasksOnly();
};

// === Pin Move (kéo thả pin) ===
const handlePinMove = async (data: { pinId: string; pinX: number; pinY: number }) => {
  if (!canManageTasks.value) {
    toast.push("Tài khoản kỹ thuật viên không có quyền di chuyển pin", "info");
    return;
  }
  // Optimistic update: cập nhật vị trí pin ngay trên UI
  const pin = pins.value.find((p: any) => (p._id || p.id) === data.pinId);
  const oldX = pin?.pinX;
  const oldY = pin?.pinY;
  if (pin) {
    pin.pinX = data.pinX;
    pin.pinY = data.pinY;
  }

  try {
    const result = await api.post("/tasks", {
      id: data.pinId,
      pinX: data.pinX,
      pinY: data.pinY
    });
    if (isOfflineQueuedResponse(result)) {
      toast.push("Đã lưu tạm vị trí pin. Sẽ đồng bộ khi có mạng.", "info");
    } else {
      toast.push("Đã di chuyển pin", "success");
    }
  } catch (err) {
    toast.push((err as Error).message, "error");
    // Rollback vị trí cũ nếu lỗi
    if (pin && oldX !== undefined) {
      pin.pinX = oldX;
      pin.pinY = oldY!;
    }
  }
};

// === Pin Click & Select ===
const handlePinClick = (pin: any) => {
  selectedTask.value = pin;
};

const handleZoneClick = (zone: any) => {
  toast.push(`Zone: ${zone._id || zone.id}`, "info");
};

const handleViewState = (state: { drawingId: string; centerX: number; centerY: number; zoom: number }) => {
  planViewState.value = {
    drawingId: state.drawingId,
    taskId: selectedTask.value?._id || selectedTask.value?.id,
    centerX: state.centerX,
    centerY: state.centerY,
    zoom: state.zoom,
    updatedAt: Date.now()
  };
};

const selectTask = (pin: any) => {
  selectedTask.value = pin;
};

const reloadTask = async () => {
  if (selected.value?.type === "drawing" && activeDrawingId.value) {
    await loadDrawingDataById(activeDrawingId.value);
  }
};

watch(
  () => offlineSync.lastSuccessfulSyncAt.value,
  async (value, previousValue) => {
    if (!value || value === previousValue) return;
    if (selected.value?.type !== "drawing") return;
    await reloadTasksOnly();
  }
);

watch(
  () => selectedTask.value?._id || selectedTask.value?.id || "",
  (taskId) => {
    if (!planViewState.value?.drawingId) return;
    planViewState.value = {
      ...planViewState.value,
      taskId: taskId || undefined,
      updatedAt: Date.now()
    };
  }
);

watch(
  () => pendingDeepLink.value?.requestedAt,
  () => {
    const focus = pendingDeepLink.value;
    if (!focus?.taskId) return;
    pendingTaskSelectionId.value = focus.taskId;
    tryApplyPendingTaskSelection();
  },
  { immediate: true }
);

// Status helpers
const statusColor = (status: string) => {
  const colors: Record<string, string> = {
    instruction: "bg-slate-500",
    rfi: "bg-amber-500",
    resolved: "bg-blue-500",
    approved: "bg-emerald-500",
    open: "bg-slate-500",
    in_progress: "bg-amber-500",
    blocked: "bg-amber-600",
    done: "bg-blue-500"
  };
  return colors[status] || "bg-slate-400";
};

const statusBadge = (status: string) => {
  const badges: Record<string, string> = {
    instruction: "bg-slate-100 text-slate-700",
    rfi: "bg-amber-100 text-amber-700",
    resolved: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    open: "bg-slate-100 text-slate-700",
    in_progress: "bg-amber-100 text-amber-700",
    blocked: "bg-amber-100 text-amber-700",
    done: "bg-blue-100 text-blue-700"
  };
  return badges[status] || "bg-slate-100 text-slate-600";
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    instruction: "Hướng dẫn",
    rfi: "RFI",
    resolved: "Đã hoàn thành",
    approved: "Đã QA duyệt",
    open: "Hướng dẫn",
    in_progress: "RFI",
    blocked: "RFI",
    done: "Đã hoàn thành"
  };
  return labels[status] || status;
};

// Watch selected node changes
watch(
  () => selected.value,
  (node) => {
    selectedTask.value = null;
    placingPin.value = false;
    if (node?.type === "drawing") {
      loadDrawingData(node);
    }
  },
  { immediate: true }
);
</script>
