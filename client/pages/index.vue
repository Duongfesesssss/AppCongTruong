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
      <section class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 sm:px-4 py-2 sm:py-3">
          <h3 class="text-sm sm:text-base font-semibold text-slate-900">Bản vẽ</h3>
          <div class="flex items-center gap-1.5 sm:gap-2">
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
        <PlanViewer
          :drawing="drawing"
          :pins="pins"
          :zones="zones"
          :loading="loading"
          :error="error"
          :placing-pin="placingPin"
          :selected-pin-id="selectedTask?._id"
          @pin-click="handlePinClick"
          @zone-click="handleZoneClick"
          @place-pin="handlePlacePin"
          @pin-move="handlePinMove"
          @cancel-place="placingPin = false"
        />
      </section>

      <!-- Layout 2 cột: Task List + Task Detail -->
      <div class="grid gap-4 sm:gap-6" :class="selectedTask ? 'lg:grid-cols-2' : ''">
        <!-- Tasks List -->
        <section class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <h3 class="text-sm sm:text-base font-semibold text-slate-900">Danh sách Task ({{ pins.length }})</h3>
          <p v-if="pins.length === 0" class="mt-3 text-center text-xs sm:text-sm text-slate-400">
            Chưa có task nào. Bấm "Thêm Task" rồi nhấn vào bản vẽ để tạo.
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
          <TaskDetail :task-id="selectedTask._id" @updated="reloadDrawingData" />
        </section>
      </div>
    </template>

    <!-- Task Detail View (khi chọn từ tree) -->
    <template v-else-if="selected?.type === 'task'">
      <TaskDetail :task-id="selected.id" @updated="reloadTask" />
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
      :parent-id="selected?.id"
      :initial-pin-x="pendingPinCoords?.pinX"
      :initial-pin-y="pendingPinCoords?.pinY"
      @close="closeTaskCreator"
      @created="handleTaskCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { useSelectedNode, type SelectedNode } from "~/composables/state/useSelectedNode";
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";

const selected = useSelectedNode();
const api = useApi();
const toast = useToast();

const drawing = ref<Record<string, unknown> | null>(null);
const pins = ref<any[]>([]);
const zones = ref<any[]>([]);
const selectedTask = ref<any>(null);

const loading = ref(false);
const error = ref("");

// Pin placement
const placingPin = ref(false);
const pendingPinCoords = ref<{ pinX: number; pinY: number } | null>(null);
const showTaskCreator = ref(false);

// Load drawing data khi chọn drawing
const loadDrawingData = async (node: SelectedNode | null) => {
  if (!node || node.type !== "drawing") {
    drawing.value = null;
    pins.value = [];
    zones.value = [];
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const [drawingData, tasksData, zonesData] = await Promise.all([
      api.get<Record<string, unknown>>(`/drawings/${node.id}`),
      api.get<any[]>(`/tasks?drawingId=${node.id}`),
      api.get<any[]>(`/drawings/${node.id}/zones`)
    ]);
    drawing.value = drawingData;
    pins.value = tasksData || [];
    zones.value = zonesData || [];
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
};

const reloadDrawingData = async () => {
  if (selected.value?.type === "drawing") {
    await loadDrawingData(selected.value);
  }
};

// Reload chỉ tasks + zones (không load lại drawing → tránh reload PDF)
const reloadTasksOnly = async () => {
  const node = selected.value;
  if (!node || node.type !== "drawing") return;
  try {
    const [tasksData, zonesData] = await Promise.all([
      api.get<any[]>(`/tasks?drawingId=${node.id}`),
      api.get<any[]>(`/drawings/${node.id}/zones`)
    ]);
    pins.value = tasksData || [];
    zones.value = zonesData || [];
  } catch {
    // Lỗi nhẹ, không cần hiển thị
  }
};

// === Pin Placement Flow ===
const togglePlacement = () => {
  if (placingPin.value) {
    placingPin.value = false;
  } else {
    placingPin.value = true;
    selectedTask.value = null; // Bỏ chọn task khi đặt pin
  }
};

const handlePlacePin = (coords: { pinX: number; pinY: number }) => {
  // Nhận toạ độ từ PlanViewer → mở form tạo task
  pendingPinCoords.value = coords;
  showTaskCreator.value = true;
  placingPin.value = false;
};

const closeTaskCreator = () => {
  showTaskCreator.value = false;
  pendingPinCoords.value = null;
};

const handleTaskCreated = async () => {
  showTaskCreator.value = false;
  pendingPinCoords.value = null;
  placingPin.value = false;
  await reloadTasksOnly();
};

// === Pin Move (kéo thả pin) ===
const handlePinMove = async (data: { pinId: string; pinX: number; pinY: number }) => {
  // Optimistic update: cập nhật vị trí pin ngay trên UI
  const pin = pins.value.find((p: any) => (p._id || p.id) === data.pinId);
  const oldX = pin?.pinX;
  const oldY = pin?.pinY;
  if (pin) {
    pin.pinX = data.pinX;
    pin.pinY = data.pinY;
  }

  try {
    await api.post("/tasks", {
      id: data.pinId,
      pinX: data.pinX,
      pinY: data.pinY
    });
    toast.push("Đã di chuyển pin", "success");
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

const selectTask = (pin: any) => {
  selectedTask.value = pin;
};

const reloadTask = async () => {
  if (selected.value?.type === "drawing") {
    await loadDrawingData(selected.value);
  }
};

// Status helpers
const statusColor = (status: string) => {
  const colors: Record<string, string> = {
    open: "bg-blue-500",
    in_progress: "bg-amber-500",
    blocked: "bg-rose-500",
    done: "bg-emerald-500"
  };
  return colors[status] || "bg-slate-400";
};

const statusBadge = (status: string) => {
  const badges: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    blocked: "bg-rose-100 text-rose-700",
    done: "bg-emerald-100 text-emerald-700"
  };
  return badges[status] || "bg-slate-100 text-slate-600";
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    open: "Mở",
    in_progress: "Đang làm",
    blocked: "Chặn",
    done: "Xong"
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
