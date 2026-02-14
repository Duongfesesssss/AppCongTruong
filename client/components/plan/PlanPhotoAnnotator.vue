<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex flex-col bg-slate-900/95">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2 sm:px-4 sm:py-3">
        <h3 class="text-xs font-semibold text-white sm:text-sm">Đo đạc & Chú thích</h3>
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <!-- Công cụ chọn -->
          <button
            class="rounded-lg px-2 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs"
            :class="tool === 'select' ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            @click="setTool('select')"
          >
            Chọn
          </button>
          <!-- Công cụ đo -->
          <button
            class="rounded-lg px-2 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs"
            :class="tool === 'dimension' ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            @click="setTool('dimension')"
          >
            Đo đạc
          </button>

          <div class="mx-1 hidden h-5 w-px bg-slate-600 sm:block"></div>

          <button
            class="rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-xs"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? "Lưu..." : "Lưu" }}
          </button>
          <button
            class="rounded-lg bg-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-600 sm:px-3 sm:py-1.5 sm:text-xs"
            @click="handleClose"
          >
            Đóng
          </button>
        </div>
      </div>

      <!-- Main content -->
      <div class="flex flex-1 flex-col overflow-hidden sm:flex-row">
        <!-- Vùng ảnh -->
        <div class="relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4">
          <div ref="imageContainerRef" class="relative inline-block max-h-full max-w-full">
            <img
              ref="imgRef"
              :src="photoUrl"
              class="block max-h-[50vh] max-w-full select-none sm:max-h-[calc(100vh-120px)]"
              draggable="false"
              @load="onImageLoad"
            />
            <!-- SVG overlay cho vẽ đường đo -->
            <svg
              v-if="imgSize.width > 0"
              ref="svgRef"
              class="absolute inset-0 h-full w-full"
              :viewBox="`0 0 ${imgSize.width} ${imgSize.height}`"
              preserveAspectRatio="none"
              :class="tool === 'dimension' ? 'cursor-crosshair' : 'cursor-default'"
              @click="handleSvgClick"
              @mousemove="handleSvgMouseMove"
            >
              <!-- Các đường đo đã vẽ -->
              <g v-for="line in annotations" :key="line.id">
                <!-- Đường chính -->
                <line
                  :x1="line.x1 * imgSize.width"
                  :y1="line.y1 * imgSize.height"
                  :x2="line.x2 * imgSize.width"
                  :y2="line.y2 * imgSize.height"
                  :stroke="editingLine?.id === line.id ? '#3b82f6' : (line.color || '#ef4444')"
                  stroke-width="2.5"
                  stroke-linecap="round"
                />
                <!-- Điểm đầu -->
                <circle
                  :cx="line.x1 * imgSize.width"
                  :cy="line.y1 * imgSize.height"
                  r="5"
                  :fill="line.color || '#ef4444'"
                  stroke="white"
                  stroke-width="1.5"
                />
                <!-- Điểm cuối -->
                <circle
                  :cx="line.x2 * imgSize.width"
                  :cy="line.y2 * imgSize.height"
                  r="5"
                  :fill="line.color || '#ef4444'"
                  stroke="white"
                  stroke-width="1.5"
                />
                <!-- Nền nhãn -->
                <rect
                  :x="midX(line) - labelWidth(line.value) / 2"
                  :y="midY(line) - 11"
                  :width="labelWidth(line.value)"
                  height="22"
                  rx="4"
                  :fill="editingLine?.id === line.id ? '#3b82f6' : (line.color || '#ef4444')"
                  opacity="0.9"
                />
                <!-- Nhãn số đo -->
                <text
                  :x="midX(line)"
                  :y="midY(line) + 4"
                  text-anchor="middle"
                  font-size="12"
                  font-weight="bold"
                  fill="white"
                  class="select-none"
                >
                  {{ line.value || "?" }}
                </text>
              </g>

              <!-- Đường đang vẽ (preview) -->
              <g v-if="drawState">
                <line
                  :x1="drawState.x1 * imgSize.width"
                  :y1="drawState.y1 * imgSize.height"
                  :x2="(cursorPos?.x ?? drawState.x1) * imgSize.width"
                  :y2="(cursorPos?.y ?? drawState.y1) * imgSize.height"
                  stroke="#3b82f6"
                  stroke-width="2"
                  stroke-dasharray="6 3"
                  stroke-linecap="round"
                />
                <circle
                  :cx="drawState.x1 * imgSize.width"
                  :cy="drawState.y1 * imgSize.height"
                  r="6"
                  fill="#3b82f6"
                  stroke="white"
                  stroke-width="2"
                />
                <circle
                  v-if="cursorPos"
                  :cx="cursorPos.x * imgSize.width"
                  :cy="cursorPos.y * imgSize.height"
                  r="6"
                  fill="#3b82f6"
                  opacity="0.5"
                  stroke="white"
                  stroke-width="1.5"
                />
                <!-- Khoảng cách pixel tạm (tham khảo) -->
                <text
                  v-if="cursorPos"
                  :x="((drawState.x1 + cursorPos.x) / 2) * imgSize.width"
                  :y="((drawState.y1 + cursorPos.y) / 2) * imgSize.height - 12"
                  text-anchor="middle"
                  font-size="11"
                  fill="#93c5fd"
                  class="select-none"
                >
                  {{ previewPixelLength }}px
                </text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Panel: danh sách đường đo (dưới trên mobile, phải trên desktop) -->
        <div class="max-h-[35vh] shrink-0 overflow-y-auto border-t border-slate-700 bg-slate-800 p-3 sm:max-h-none sm:w-72 sm:border-l sm:border-t-0 sm:p-4">
          <h4 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Các đường đo ({{ annotations.length }})
          </h4>

          <div v-if="annotations.length === 0" class="rounded-lg bg-slate-700/30 p-4 text-center text-xs text-slate-500">
            Chọn công cụ "Đo đạc" rồi nhấn 2 điểm trên ảnh để vẽ đường đo.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(line, idx) in annotations"
              :key="line.id"
              class="group rounded-lg bg-slate-700/50 p-3"
              :class="editingLine?.id === line.id ? 'ring-1 ring-brand-400' : ''"
            >
              <div class="flex items-center gap-2">
                <div
                  class="h-3 w-3 shrink-0 rounded-full"
                  :style="{ backgroundColor: line.color || '#ef4444' }"
                ></div>
                <span class="flex-1 text-xs font-medium text-slate-200">Đường {{ idx + 1 }}</span>
                <button
                  class="shrink-0 rounded p-1 text-slate-500 opacity-0 hover:bg-slate-600 hover:text-rose-400 group-hover:opacity-100"
                  title="Xoá đường đo"
                  @click="removeLine(line.id)"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div class="mt-2">
                <input
                  v-model="line.value"
                  class="w-full rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white placeholder-slate-400 focus:border-brand-400 focus:outline-none"
                  placeholder="Nhập số đo (VD: 120mm, 2.5m)..."
                  @focus="editingLine = line"
                  @blur="editingLine = null"
                />
              </div>
              <p class="mt-1 text-[10px] text-slate-500">
                {{ pixelLength(line) }}px trên ảnh
              </p>
            </div>
          </div>

          <!-- Chọn màu -->
          <div class="mt-4 rounded-lg bg-slate-700/30 p-3">
            <p class="mb-2 text-xs text-slate-400">Màu đường đo tiếp theo</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="c in lineColors"
                :key="c"
                class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                :class="currentColor === c ? 'border-white scale-110' : 'border-transparent'"
                :style="{ backgroundColor: c }"
                @click="currentColor = c"
              ></button>
            </div>
          </div>

          <!-- Hướng dẫn -->
          <div class="mt-4 rounded-lg bg-slate-700/30 p-3">
            <p class="text-xs font-medium text-slate-400">Hướng dẫn</p>
            <ul class="mt-1 space-y-1 text-[11px] text-slate-500">
              <li>1. Chọn công cụ <strong class="text-slate-300">Đo đạc</strong></li>
              <li>2. Nhấn điểm đầu trên ảnh</li>
              <li>3. Nhấn điểm cuối → đường đo xuất hiện</li>
              <li>4. Nhập số đo thực tế vào ô bên cạnh</li>
              <li>5. Nhấn <strong class="text-slate-300">Lưu</strong> để lưu lại</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { isOfflineQueuedResponse, useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";

export type DimensionLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  value: string;
  color: string;
};

const props = defineProps<{
  show: boolean;
  photoUrl: string;
  photoId: string;
  initialAnnotations?: DimensionLine[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const api = useApi();
const toast = useToast();

// Refs
const imgRef = ref<HTMLImageElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const imageContainerRef = ref<HTMLElement | null>(null);

// Image info
const imgSize = reactive({ width: 0, height: 0 });

// Tool state
const tool = ref<"select" | "dimension">("dimension");
const annotations = ref<DimensionLine[]>([]);
const drawState = ref<{ x1: number; y1: number } | null>(null);
const cursorPos = ref<{ x: number; y: number } | null>(null);
const editingLine = ref<DimensionLine | null>(null);
const saving = ref(false);

// Màu sắc
const lineColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
const currentColor = ref("#ef4444");

const setTool = (t: "select" | "dimension") => {
  tool.value = t;
  drawState.value = null;
  cursorPos.value = null;
};

const onImageLoad = () => {
  if (!imgRef.value) return;
  imgSize.width = imgRef.value.naturalWidth;
  imgSize.height = imgRef.value.naturalHeight;
};

// Tính toạ độ SVG từ mouse event
const getSvgCoords = (event: MouseEvent): { x: number; y: number } | null => {
  if (!svgRef.value) return null;
  const rect = svgRef.value.getBoundingClientRect();
  return {
    x: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1),
    y: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1)
  };
};

// Click trên SVG → đặt điểm đo
const handleSvgClick = (event: MouseEvent) => {
  if (tool.value !== "dimension") return;
  const coords = getSvgCoords(event);
  if (!coords) return;

  if (!drawState.value) {
    // Click lần 1: điểm đầu
    drawState.value = { x1: coords.x, y1: coords.y };
  } else {
    // Click lần 2: điểm cuối → tạo đường đo
    const newLine: DimensionLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x1: drawState.value.x1,
      y1: drawState.value.y1,
      x2: coords.x,
      y2: coords.y,
      value: "",
      color: currentColor.value
    };
    annotations.value.push(newLine);
    drawState.value = null;
    cursorPos.value = null;
    // Focus vào input vừa tạo (nextTick)
    nextTick(() => {
      editingLine.value = newLine;
    });
  }
};

// Mouse move trên SVG → preview đường đang vẽ
const handleSvgMouseMove = (event: MouseEvent) => {
  if (tool.value !== "dimension" || !drawState.value) {
    cursorPos.value = null;
    return;
  }
  cursorPos.value = getSvgCoords(event);
};

// Xoá đường đo
const removeLine = (id: string) => {
  annotations.value = annotations.value.filter((l: DimensionLine) => l.id !== id);
  if (editingLine.value?.id === id) editingLine.value = null;
};

// Tính tọa độ trung điểm (cho nhãn)
const midX = (line: DimensionLine) => ((line.x1 + line.x2) / 2) * imgSize.width;
const midY = (line: DimensionLine) => ((line.y1 + line.y2) / 2) * imgSize.height;

// Tính chiều rộng nhãn (xấp xỉ)
const labelWidth = (text: string) => {
  const t = text || "?";
  return t.length * 7.5 + 16;
};

// Tính khoảng cách pixel trên ảnh
const pixelLength = (line: DimensionLine) => {
  const dx = (line.x2 - line.x1) * imgSize.width;
  const dy = (line.y2 - line.y1) * imgSize.height;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
};

// Preview pixel length khi đang vẽ
const previewPixelLength = computed(() => {
  if (!drawState.value || !cursorPos.value) return "0";
  const dx = (cursorPos.value.x - drawState.value.x1) * imgSize.width;
  const dy = (cursorPos.value.y - drawState.value.y1) * imgSize.height;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
});

// Lưu annotations
const handleSave = async () => {
  saving.value = true;
  try {
    const result = await api.patch(`/photos/${props.photoId}`, {
      annotations: annotations.value
    });
    if (isOfflineQueuedResponse(result)) {
      toast.push("Da luu tam chu thich, se dong bo khi co mang", "info");
    } else {
      toast.push("Đã lưu chú thích đo đạc", "success");
      emit("saved");
    }
  } catch (err) {
    toast.push((err as Error).message, "error");
  } finally {
    saving.value = false;
  }
};

const handleClose = () => {
  drawState.value = null;
  cursorPos.value = null;
  editingLine.value = null;
  emit("close");
};

// Khởi tạo annotations khi mở
watch(
  () => props.show,
  (v: boolean) => {
    if (v) {
      annotations.value = props.initialAnnotations?.map((a) => ({ ...a })) ?? [];
      tool.value = "dimension";
      drawState.value = null;
      cursorPos.value = null;
      editingLine.value = null;
      imgSize.width = 0;
      imgSize.height = 0;
    }
  }
);

// Escape key để đóng
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.show) {
      if (drawState.value) {
        // Huỷ đường đang vẽ
        drawState.value = null;
        cursorPos.value = null;
      } else {
        handleClose();
      }
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeydown);
    onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
  }
});
</script>
