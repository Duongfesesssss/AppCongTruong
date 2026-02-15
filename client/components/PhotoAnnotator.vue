<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black p-0"
        @click.self="emit('close')"
      >
        <div class="flex h-full w-full flex-col bg-white sm:max-w-7xl sm:max-h-[95vh] sm:rounded-2xl sm:shadow-2xl">
          <!-- Header (mobile-optimized) -->
          <div class="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 sm:px-6 sm:py-4">
            <h3 class="text-base font-semibold text-slate-900 sm:text-lg">Đo đạc ảnh</h3>
            <div class="flex items-center gap-1 sm:gap-2">
              <!-- Download template button -->
              <button
                class="flex h-9 items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 text-xs font-medium text-purple-700 hover:bg-purple-100 active:bg-purple-200 sm:h-10 sm:px-3 sm:text-sm"
                title="Tải file Excel mẫu"
                @click="downloadExcelTemplate"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="hidden xs:inline">Mẫu</span>
              </button>
              <!-- Import button -->
              <input
                ref="importFileInput"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="handleImportExcel"
              />
              <button
                class="flex h-9 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100 active:bg-blue-200 sm:h-10 sm:px-3 sm:text-sm"
                @click="triggerImport"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span class="hidden xs:inline">Import</span>
              </button>
              <!-- Export button -->
              <button
                class="flex h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 sm:h-10 sm:px-3 sm:text-sm"
                @click="exportImage"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span class="hidden xs:inline">Tải về</span>
              </button>
              <!-- Close button -->
              <button
                class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200 sm:h-10 sm:w-10"
                @click="emit('close')"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Toolbar (mobile-optimized with large touch targets) -->
          <div class="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2 sm:gap-2 sm:px-4">
            <button
              class="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-medium sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
              :class="mode === 'draw' ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'"
              @click="mode = 'draw'"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Vẽ đường
            </button>
            <button
              class="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-medium sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
              :class="mode === 'pan' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'"
              @click="mode = 'pan'"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
              Kéo ảnh
            </button>
            <button
              class="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-medium sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
              :class="mode === 'select' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'"
              @click="mode = 'select'"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Chọn/Sửa
              </button>
            <button
              v-if="selectedLine !== null"
              class="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 active:bg-blue-200 sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
              @click="editLine"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Sửa
            </button>
            <button
              v-if="selectedLine !== null"
              class="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 hover:bg-rose-100 active:bg-rose-200 sm:h-9 sm:flex-none sm:px-4 sm:text-sm"
              @click="deleteLine"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Xoá
            </button>
          </div>

          <!-- Color and Width Controls -->
          <div class="flex items-center gap-2 border-b border-slate-200 bg-white px-2 py-2 sm:px-4">
            <!-- Color picker -->
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-medium text-slate-600 sm:text-sm">Màu:</span>
              <div class="flex gap-1.5">
                <button
                  v-for="color in COLORS"
                  :key="color.value"
                  type="button"
                  class="h-9 w-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
                  :style="{ backgroundColor: color.value }"
                  :class="selectedColor === color.value ? 'ring-2 ring-brand-500 ring-offset-2 border-white' : 'border-slate-300'"
                  :title="color.name"
                  @click="selectedColor = color.value"
                ></button>
              </div>
            </div>

            <!-- Width selector -->
            <div class="ml-auto flex items-center gap-1.5">
              <span class="text-xs font-medium text-slate-600 sm:text-sm">Độ dày:</span>
              <select
                v-model.number="selectedWidth"
                class="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10 sm:text-sm"
              >
                <option v-for="width in LINE_WIDTHS" :key="width" :value="width">
                  {{ width }}px
                </option>
              </select>
            </div>
          </div>

          <!-- History Panel (quick buttons) -->
          <div v-if="recentHistory.length > 0" class="border-b border-slate-200 bg-slate-50 px-2 py-2 sm:px-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-slate-600 sm:text-sm">Gần đây:</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="item in recentHistory"
                  :key="item.id"
                  type="button"
                  class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-brand-50 hover:border-brand-300 active:bg-brand-100"
                  @click="useHistoryItem(item)"
                  :title="`Click để dùng lại: ${item.realDistance}`"
                >
                  <span>{{ item.realDistance }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Canvas area (flex-1 for full remaining height) -->
          <div class="relative flex-1 touch-none overflow-hidden bg-white flex items-center justify-center">
            <canvas
              ref="canvasRef"
              class="cursor-crosshair"
              :class="{ 'cursor-pointer': mode === 'select', 'cursor-move': mode === 'pan' }"
              @pointerdown="handlePointerDown"
              @pointermove="handlePointerMove"
              @pointerup="handlePointerUp"
              @pointercancel="handlePointerUp"
              @wheel.prevent="handleWheel"
            ></canvas>

            <!-- Zoom controls (fixed bottom-right) -->
            <div class="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur-sm sm:bottom-3 sm:right-3">
              <button
                class="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 active:bg-slate-200 sm:h-9 sm:w-9"
                title="Thu nhỏ"
                @click="zoomOut"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </button>
              <button
                class="flex h-8 min-w-[3rem] items-center justify-center rounded text-xs font-medium text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                title="Reset zoom"
                @click="resetView"
              >
                {{ Math.round(zoomLevel * 100) }}%
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 active:bg-slate-200 sm:h-9 sm:w-9"
                title="Phóng to"
                @click="zoomIn"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <!-- Instructions overlay -->
            <div v-if="lines.length === 0" class="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div class="rounded-lg bg-black/60 px-4 py-3 text-center text-sm text-white backdrop-blur-sm">
                <p class="font-medium">Chạm và kéo để vẽ đường đo</p>
                <p class="mt-1 text-xs opacity-75">Dùng 2 ngón để pinch zoom • Khoảng cách hiển thị tự động</p>
              </div>
            </div>
          </div>

          <!-- Info bar -->
          <div class="border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 sm:px-4 sm:text-sm">
            Đã vẽ: <span class="font-semibold text-slate-900">{{ lines.length }}</span> đường
            <span v-if="mode === 'draw'" class="ml-2 text-brand-600">• Đang vẽ</span>
            <span v-if="mode === 'pan'" class="ml-2 text-emerald-600">• Kéo ảnh</span>
            <span v-if="mode === 'select' && selectedLine !== null" class="ml-2 text-amber-600">• Đã chọn</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Measurement Input Modal -->
    <MeasurementInputModal
      :show="showMeasurementModal"
      :pixel-distance="pendingLineIndex !== null ? lines[pendingLineIndex]?.distance || 0 : 0"
      :initial-name="pendingLineIndex !== null ? lines[pendingLineIndex]?.name : undefined"
      :initial-distance="pendingLineIndex !== null ? lines[pendingLineIndex]?.realDistance : undefined"
      :initial-category="pendingLineIndex !== null ? lines[pendingLineIndex]?.category : undefined"
      :initial-room="pendingLineIndex !== null ? lines[pendingLineIndex]?.room : undefined"
      :initial-notes="pendingLineIndex !== null ? lines[pendingLineIndex]?.notes : undefined"
      @save="handleMeasurementSave"
      @cancel="handleMeasurementCancel"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { isOfflineQueuedResponse, useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";
import { useAnnotationHistory } from "~/composables/state/useAnnotationHistory";

type Line = {
  // === Tọa độ vẽ ===
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  // === Đo đạc ===
  distance: number;           // khoảng cách pixel (dùng để tính tỷ lệ)
  realValue?: number;         // giá trị số thực (vd: 2.5)
  unit?: string;              // đơn vị (m, cm, mm, ft, in, etc.)
  realDistance?: string;      // LEGACY: "2.5m" - giữ để tương thích với code cũ
  scale?: number;             // tỷ lệ: realValue / distance (tự động tính)

  // === Thông tin mô tả ===
  name?: string;              // tên đường đo (vd: "Chiều dài phòng")
  category?: string;          // loại đo đạc (width, height, depth, diagonal, perimeter, area)
  notes?: string;             // ghi chú bổ sung
  room?: string;              // phòng/khu vực

  // === Metadata ===
  createdAt?: number;         // timestamp tạo
  measuredBy?: string;        // người đo (userId hoặc tên)

  // === Hiển thị UI ===
  color?: string;             // màu vẽ
  width?: number;             // độ dày line
};

const props = defineProps<{
  show: boolean;
  photoUrl: string;
  photoId: string;
  photoWidth?: number;
  photoHeight?: number;
  initialAnnotations?: Line[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const api = useApi();
const toast = useToast();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const image = ref<HTMLImageElement | null>(null);
const importFileInput = ref<HTMLInputElement | null>(null);

const mode = ref<"draw" | "pan" | "select">("draw");
const lines = ref<Line[]>([]);
const selectedLine = ref<number | null>(null);

// Pan/zoom state
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5;
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref<{ x: number; y: number } | null>(null);
const zoomLevel = ref(1);

type PinchState = {
  startDistance: number;
  startZoom: number;
  anchorWorld: { x: number; y: number };
};

const activeTouchPointers = new Map<number, { x: number; y: number }>();
let pinchState: PinchState | null = null;

// Drawing state
const drawing = ref(false);
const startPoint = ref<{ x: number; y: number } | null>(null);
const currentPoint = ref<{ x: number; y: number } | null>(null);

// Dragging state (for moving selected line)
const dragging = ref(false);
const dragStart = ref<{ x: number; y: number } | null>(null);

// Endpoint dragging state
const draggingEndpoint = ref<{ lineIndex: number; endpoint: 'start' | 'end' } | null>(null);

// Color and width options
const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Black', value: '#1f2937' }
];
const LINE_WIDTHS = [2, 3, 4, 5, 6];

// Drawing customization state
const selectedColor = ref<string>("#10b981");
const selectedWidth = ref<number>(3);

// Measurement input state
const showMeasurementModal = ref(false);
const pendingLineIndex = ref<number | null>(null);

// History
const annotationHistory = useAnnotationHistory();

// Cache photoId to avoid issues when closing
const cachedPhotoId = ref<string>("");

// === Autosave draft to localStorage ===
let autosaveInterval: ReturnType<typeof setInterval> | null = null;

const getDraftKey = (photoId: string) => `photo-draft-${photoId}`;

const saveDraft = () => {
  if (lines.value.length === 0 || !cachedPhotoId.value) return;
  try {
    const draft = {
      annotations: normalizeLines(lines.value),
      timestamp: Date.now()
    };
    localStorage.setItem(getDraftKey(cachedPhotoId.value), JSON.stringify(draft));
  } catch {}
};

const loadDraft = (photoId: string): Line[] | null => {
  try {
    const raw = localStorage.getItem(getDraftKey(photoId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (draft.annotations && draft.annotations.length > 0) {
      return draft.annotations;
    }
  } catch {}
  return null;
};

const clearDraft = (photoId: string) => {
  try { localStorage.removeItem(getDraftKey(photoId)); } catch {}
};

const startAutosave = () => {
  stopAutosave();
  autosaveInterval = setInterval(saveDraft, 15000); // Mỗi 15 giây
};

const stopAutosave = () => {
  if (autosaveInterval) {
    clearInterval(autosaveInterval);
    autosaveInterval = null;
  }
};

// Recent history computed
const recentHistory = computed(() => {
  return annotationHistory.getRecentGlobal(6);
});

// Use history item
const useHistoryItem = (item: any) => {
  if (pendingLineIndex.value !== null && lines.value[pendingLineIndex.value]) {
    const line = lines.value[pendingLineIndex.value];
    line.realDistance = item.realDistance;
    draw();
    toast.push(`Đã dùng: ${item.realDistance}`, "success");
  }
};

// Helper: lấy display size hiện tại của canvas
const getDisplaySize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return { w: 1, h: 1 };
  const w = parseFloat(canvas.style.width) || canvas.width || 1;
  const h = parseFloat(canvas.style.height) || canvas.height || 1;
  return { w, h };
};

const clampInRange = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const clampUnit = (value: number) => clampInRange(value, 0, 1);

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const lineLength = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.hypot(x2 - x1, y2 - y1);
};

const isUnitValue = (value: number) => value >= 0 && value <= 1;

const isNormalizedLine = (line: Line) => {
  const x1 = toFiniteNumber(line.x1);
  const y1 = toFiniteNumber(line.y1);
  const x2 = toFiniteNumber(line.x2);
  const y2 = toFiniteNumber(line.y2);
  return isUnitValue(x1) && isUnitValue(y1) && isUnitValue(x2) && isUnitValue(y2);
};

const resolveLegacyBasis = () => {
  const imageWidth = toFiniteNumber(props.photoWidth ?? image.value?.naturalWidth, 0);
  const imageHeight = toFiniteNumber(props.photoHeight ?? image.value?.naturalHeight, 0);
  if (imageWidth > 1 && imageHeight > 1) {
    return { w: imageWidth, h: imageHeight };
  }
  const current = getDisplaySize();
  return {
    w: Math.max(current.w, 1),
    h: Math.max(current.h, 1)
  };
};

const toNormalizedLine = (line: Line): Line => {
  const rawX1 = toFiniteNumber(line.x1);
  const rawY1 = toFiniteNumber(line.y1);
  const rawX2 = toFiniteNumber(line.x2);
  const rawY2 = toFiniteNumber(line.y2);

  let x1 = rawX1;
  let y1 = rawY1;
  let x2 = rawX2;
  let y2 = rawY2;

  if (isNormalizedLine({ ...line, x1: rawX1, y1: rawY1, x2: rawX2, y2: rawY2 })) {
    x1 = clampUnit(rawX1);
    y1 = clampUnit(rawY1);
    x2 = clampUnit(rawX2);
    y2 = clampUnit(rawY2);
  } else {
    const basis = resolveLegacyBasis();
    x1 = clampUnit(rawX1 / basis.w);
    y1 = clampUnit(rawY1 / basis.h);
    x2 = clampUnit(rawX2 / basis.w);
    y2 = clampUnit(rawY2 / basis.h);
  }

  return {
    ...line,
    x1,
    y1,
    x2,
    y2,
    distance: lineLength(x1, y1, x2, y2)
  };
};

// Normalize pixel coords → 0-1 range (để lưu trữ)
const normalizeLines = (pixelLines: Line[]): Line[] => {
  const { w, h } = getDisplaySize();
  const safeW = Math.max(w, 1);
  const safeH = Math.max(h, 1);
  return pixelLines.map((line) => {
    const x1 = clampUnit(toFiniteNumber(line.x1) / safeW);
    const y1 = clampUnit(toFiniteNumber(line.y1) / safeH);
    const x2 = clampUnit(toFiniteNumber(line.x2) / safeW);
    const y2 = clampUnit(toFiniteNumber(line.y2) / safeH);
    return {
      ...line,
      x1,
      y1,
      x2,
      y2,
      distance: lineLength(x1, y1, x2, y2)
    };
  });
};

// Denormalize 0-1 coords → pixel coords (để hiển thị)
const denormalizeLines = (normalizedLines: Line[]): Line[] => {
  const { w, h } = getDisplaySize();
  const safeW = Math.max(w, 1);
  const safeH = Math.max(h, 1);
  return normalizedLines.map((line) => {
    const x1 = clampInRange(toFiniteNumber(line.x1) * safeW, 0, safeW);
    const y1 = clampInRange(toFiniteNumber(line.y1) * safeH, 0, safeH);
    const x2 = clampInRange(toFiniteNumber(line.x2) * safeW, 0, safeW);
    const y2 = clampInRange(toFiniteNumber(line.y2) * safeH, 0, safeH);
    return {
      ...line,
      x1,
      y1,
      x2,
      y2,
      distance: lineLength(x1, y1, x2, y2)
    };
  });
};

// Migration: Convert legacy Line to new format
const migrateLine = (line: Line): Line => {
  const migrated = { ...line };

  // Parse realDistance to get realValue + unit if not already present
  if (migrated.realDistance && !migrated.realValue) {
    const { value, unit } = parseDistance(migrated.realDistance);
    migrated.realValue = value;
    migrated.unit = unit;
  }

  // Add timestamp if missing (use current time as fallback)
  if (!migrated.createdAt) {
    migrated.createdAt = Date.now();
  }

  return migrated;
};

const loadImage = () => {
  if (!props.photoUrl) return;

  console.log("loadImage called", {
    photoUrl: props.photoUrl,
    photoId: props.photoId,
    initialAnnotations: props.initialAnnotations
  });

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    image.value = img;
    resizeCanvas();
    // Kiểm tra draft trong localStorage trước
    const draft = loadDraft(cachedPhotoId.value);
    if (draft && draft.length > 0) {
      // Có draft chưa lưu → recover
      const normalized = draft.map(migrateLine).map(toNormalizedLine);
      lines.value = denormalizeLines(normalized);
      toast.push("Đã khôi phục bản nháp chưa lưu", "success");
      console.log("Recovered draft annotations:", lines.value);
    } else if (props.initialAnnotations && props.initialAnnotations.length > 0) {
      // Migrate → denormalize (0-1 → pixel) cho display hiện tại
      const normalized = props.initialAnnotations.map(migrateLine).map(toNormalizedLine);
      lines.value = denormalizeLines(normalized);
      console.log("Loaded, migrated and denormalized annotations:", lines.value);
    } else {
      console.log("No initial annotations to load");
      lines.value = [];
    }
    draw();
  };
  img.onerror = () => {
    toast.push("Không thể tải ảnh", "error");
  };
  // Thêm timestamp để tránh cache
  const urlWithTimestamp = props.photoUrl.includes('?')
    ? `${props.photoUrl}&t=${Date.now()}`
    : `${props.photoUrl}?t=${Date.now()}`;
  img.src = urlWithTimestamp;
};

const resizeCanvas = () => {
  const canvas = canvasRef.value;
  const img = image.value;
  if (!canvas || !img) return;

  const container = canvas.parentElement;
  if (!container) return;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Tính scale để fit ảnh vào container
  const scale = Math.min(
    containerWidth / img.width,
    containerHeight / img.height
  );

  const displayWidth = img.width * scale;
  const displayHeight = img.height * scale;

  // Sử dụng devicePixelRatio để ảnh sắc nét hơn
  const dpr = window.devicePixelRatio || 1;

  // Set canvas internal resolution cao hơn
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;

  // Set CSS display size
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const context = canvas.getContext("2d");
  if (context) {
    // Enable high-quality image rendering
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    // Scale context để vẽ dễ dàng hơn - coordinates sẽ theo display size
    context.scale(dpr, dpr);
    ctx.value = context;
  }
};

const getDisplayPointFromClient = (clientX: number, clientY: number) => {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const displayWidth = parseFloat(canvas.style.width) || canvas.width;
  const displayHeight = parseFloat(canvas.style.height) || canvas.height;
  const x = ((clientX - rect.left) / rect.width) * displayWidth;
  const y = ((clientY - rect.top) / rect.height) * displayHeight;
  return { x, y, displayWidth, displayHeight };
};

const clampZoom = (value: number) => clampInRange(value, MIN_ZOOM, MAX_ZOOM);

const applyZoomAt = (targetZoom: number, anchorClient?: { x: number; y: number }) => {
  const nextZoom = clampZoom(targetZoom);
  const prevZoom = zoomLevel.value;
  if (prevZoom === nextZoom) return;

  const anchor = anchorClient
    ? getDisplayPointFromClient(anchorClient.x, anchorClient.y)
    : null;

  if (!anchor) {
    zoomLevel.value = nextZoom;
    draw();
    return;
  }

  const worldX = (anchor.x - panOffset.value.x) / prevZoom;
  const worldY = (anchor.y - panOffset.value.y) / prevZoom;

  zoomLevel.value = nextZoom;
  panOffset.value.x = anchor.x - worldX * nextZoom;
  panOffset.value.y = anchor.y - worldY * nextZoom;
  draw();
};

// === Zoom controls ===
const zoomIn = () => applyZoomAt(zoomLevel.value * 1.25);
const zoomOut = () => applyZoomAt(zoomLevel.value / 1.25);
const resetView = () => {
  zoomLevel.value = 1;
  panOffset.value = { x: 0, y: 0 };
  draw();
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  applyZoomAt(zoomLevel.value * factor, { x: e.clientX, y: e.clientY });
};

// Handle resize: lưu tạm về normalized rồi dựng lại theo canvas mới để tránh drift giữa thiết bị.
const handleResize = () => {
  const normalized = normalizeLines(lines.value);
  resizeCanvas();
  lines.value = denormalizeLines(normalized);
  draw();
};

const draw = () => {
  const canvas = canvasRef.value;
  const context = ctx.value;
  const img = image.value;
  if (!canvas || !context || !img) return;

  // Get display dimensions (CSS size, not internal canvas size)
  const displayWidth = parseFloat(canvas.style.width) || canvas.width;
  const displayHeight = parseFloat(canvas.style.height) || canvas.height;

  // Clear canvas - use display size vì context đã được scale
  context.clearRect(0, 0, displayWidth, displayHeight);

  // Save context state
  context.save();

  // Apply pan + zoom
  context.translate(panOffset.value.x, panOffset.value.y);
  context.scale(zoomLevel.value, zoomLevel.value);

  // Draw image
  context.drawImage(img, 0, 0, displayWidth, displayHeight);

  // Draw all lines
  lines.value.forEach((line, index) => {
    const isSelected = index === selectedLine.value;
    drawLine(context, line, isSelected);
  });

  // Draw current drawing line
  if (drawing.value && startPoint.value && currentPoint.value) {
    const tempLine = {
      x1: startPoint.value.x,
      y1: startPoint.value.y,
      x2: currentPoint.value.x,
      y2: currentPoint.value.y,
      distance: calculateDistance(startPoint.value, currentPoint.value)
    };
    drawLine(context, tempLine, false, true);
  }

  // Restore context state
  context.restore();
};

const drawLine = (context: CanvasRenderingContext2D, line: Line, isSelected: boolean, isTemp = false) => {
  // Determine color: selected (amber), temp (blue), or line's color (default green)
  const lineColor = isSelected ? "#f59e0b" : isTemp ? "#3b82f6" : (line.color || "#10b981");
  const lineWidth = line.width || 3;

  // Line
  context.strokeStyle = lineColor;
  context.lineWidth = isSelected ? lineWidth + 1 : lineWidth;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(line.x1, line.y1);
  context.lineTo(line.x2, line.y2);
  context.stroke();

  // End points
  const endpointRadius = isSelected ? 8 : 6;
  context.fillStyle = lineColor;

  // Draw endpoints with outline if selected
  if (isSelected) {
    // Outline
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(line.x1, line.y1, endpointRadius, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(line.x2, line.y2, endpointRadius, 0, Math.PI * 2);
    context.stroke();
  }

  // Fill
  context.beginPath();
  context.arc(line.x1, line.y1, endpointRadius, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(line.x2, line.y2, endpointRadius, 0, Math.PI * 2);
  context.fill();

  // Distance label - only show if there's a name or realDistance
  if (!isTemp && (line.name || line.realDistance)) {
    const midX = (line.x1 + line.x2) / 2;
    const midY = (line.y1 + line.y2) / 2;

    // Get category icon
    const getCategoryIcon = (category?: string): string => {
      const icons: Record<string, string> = {
        width: "📏",
        height: "📐",
        depth: "📊",
        diagonal: "📐",
        perimeter: "⭕",
        area: "🔲",
        other: "📝"
      };
      return category && icons[category] ? `${icons[category]} ` : "";
    };

    // Build label text with category icon
    let labelText = "";
    const categoryIcon = getCategoryIcon(line.category);

    if (line.name && line.realDistance) {
      labelText = `${categoryIcon}${line.name}: ${line.realDistance}`;
    } else if (line.name) {
      labelText = `${categoryIcon}${line.name}`;
    } else if (line.realDistance) {
      labelText = `${categoryIcon}${line.realDistance}`;
    }

    if (labelText) {
      context.save();

      // Calculate angle of the line
      const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);

      // Move to midpoint and rotate
      context.translate(midX, midY);
      context.rotate(angle);

      context.font = "bold 14px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";

      // Background
      const metrics = context.measureText(labelText);
      const padding = 6;
      context.fillStyle = "rgba(0, 0, 0, 0.75)";
      context.fillRect(
        -metrics.width / 2 - padding,
        -10,
        metrics.width + padding * 2,
        20
      );

      // Text
      context.fillStyle = "#ffffff";
      context.fillText(labelText, 0, 0);

      context.restore();
    }
  }
};

const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const getCanvasCoords = (e: PointerEvent) => {
  const displayPoint = getDisplayPointFromClient(e.clientX, e.clientY);
  if (!displayPoint) return null;
  const xRaw = (displayPoint.x - panOffset.value.x) / zoomLevel.value;
  const yRaw = (displayPoint.y - panOffset.value.y) / zoomLevel.value;
  return {
    x: clampInRange(xRaw, 0, displayPoint.displayWidth),
    y: clampInRange(yRaw, 0, displayPoint.displayHeight)
  };
};

const getActiveTouchPair = () => {
  const points = Array.from(activeTouchPointers.values());
  if (points.length < 2) return null;
  return [points[0], points[1]] as const;
};

const touchDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  return Math.hypot(b.x - a.x, b.y - a.y);
};

const touchMidpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
};

const beginPinch = () => {
  const pair = getActiveTouchPair();
  if (!pair) return;
  const [first, second] = pair;
  const startDistance = touchDistance(first, second);
  if (startDistance < 4) return;

  const midpoint = touchMidpoint(first, second);
  const anchor = getDisplayPointFromClient(midpoint.x, midpoint.y);
  if (!anchor) return;

  pinchState = {
    startDistance,
    startZoom: zoomLevel.value,
    anchorWorld: {
      x: (anchor.x - panOffset.value.x) / zoomLevel.value,
      y: (anchor.y - panOffset.value.y) / zoomLevel.value
    }
  };

  // Hủy trạng thái tương tác 1 ngón để tránh tạo line rác khi chuyển sang pinch.
  drawing.value = false;
  dragging.value = false;
  draggingEndpoint.value = null;
  isPanning.value = false;
  panStart.value = null;
  startPoint.value = null;
  currentPoint.value = null;
  dragStart.value = null;
};

const updatePinch = () => {
  if (!pinchState) return;
  const pair = getActiveTouchPair();
  if (!pair) return;
  const [first, second] = pair;
  const nextDistance = touchDistance(first, second);
  if (nextDistance <= 0) return;

  const nextZoom = clampZoom(pinchState.startZoom * (nextDistance / pinchState.startDistance));
  const midpoint = touchMidpoint(first, second);
  const anchor = getDisplayPointFromClient(midpoint.x, midpoint.y);
  if (!anchor) return;

  zoomLevel.value = nextZoom;
  panOffset.value.x = anchor.x - pinchState.anchorWorld.x * nextZoom;
  panOffset.value.y = anchor.y - pinchState.anchorWorld.y * nextZoom;
  draw();
};

const findLineAt = (point: { x: number; y: number }) => {
  const threshold = 15; // Touch-friendly threshold

  for (let i = lines.value.length - 1; i >= 0; i--) {
    const line = lines.value[i];
    const dist = distanceToLine(point, line);
    if (dist < threshold) return i;
  }
  return null;
};

// Find which endpoint is being clicked (returns {lineIndex, endpoint: 'start'|'end'})
const findEndpointAt = (point: { x: number; y: number }): { lineIndex: number; endpoint: 'start' | 'end' } | null => {
  const threshold = 20; // Larger threshold for endpoints

  for (let i = lines.value.length - 1; i >= 0; i--) {
    const line = lines.value[i];

    // Check distance to start point
    const distToStart = Math.sqrt(
      Math.pow(point.x - line.x1, 2) + Math.pow(point.y - line.y1, 2)
    );
    if (distToStart < threshold) {
      return { lineIndex: i, endpoint: 'start' };
    }

    // Check distance to end point
    const distToEnd = Math.sqrt(
      Math.pow(point.x - line.x2, 2) + Math.pow(point.y - line.y2, 2)
    );
    if (distToEnd < threshold) {
      return { lineIndex: i, endpoint: 'end' };
    }
  }

  return null;
};

const distanceToLine = (point: { x: number; y: number }, line: Line) => {
  const A = point.x - line.x1;
  const B = point.y - line.y1;
  const C = line.x2 - line.x1;
  const D = line.y2 - line.y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = line.x1;
    yy = line.y1;
  } else if (param > 1) {
    xx = line.x2;
    yy = line.y2;
  } else {
    xx = line.x1 + param * C;
    yy = line.y1 + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

const handlePointerDown = (e: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  if (e.pointerType === "touch") {
    activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (activeTouchPointers.size >= 2) {
      beginPinch();
      e.preventDefault();
      return;
    }
  }

  if (pinchState) return;

  if (mode.value === "pan") {
    // For pan mode, we need screen coordinates, not canvas coordinates
    isPanning.value = true;
    panStart.value = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
    return;
  }

  const coords = getCanvasCoords(e);
  if (!coords) return;

  if (mode.value === "draw") {
    drawing.value = true;
    startPoint.value = coords;
    currentPoint.value = coords;
  } else if (mode.value === "select") {
    // Check for endpoint click first (higher priority)
    const endpoint = findEndpointAt(coords);
    if (endpoint !== null) {
      selectedLine.value = endpoint.lineIndex;
      draggingEndpoint.value = endpoint;
      draw();
      return;
    }

    // Then check for line click
    const lineIndex = findLineAt(coords);
    if (lineIndex !== null) {
      selectedLine.value = lineIndex;
      dragging.value = true;
      dragStart.value = coords;
    } else {
      selectedLine.value = null;
    }
    draw();
  }
};

const handlePointerMove = (e: PointerEvent) => {
  if (e.pointerType === "touch" && activeTouchPointers.has(e.pointerId)) {
    activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchState || activeTouchPointers.size >= 2) {
      if (!pinchState) {
        beginPinch();
      }
      updatePinch();
      e.preventDefault();
      return;
    }
  }

  if (pinchState) return;

  if (mode.value === "pan" && isPanning.value && panStart.value) {
    // Pan the image
    const dx = e.clientX - panStart.value.x;
    const dy = e.clientY - panStart.value.y;

    panOffset.value.x += dx;
    panOffset.value.y += dy;

    panStart.value = { x: e.clientX, y: e.clientY };
    draw();
    return;
  }

  const coords = getCanvasCoords(e);
  if (!coords) return;

  if (mode.value === "draw" && drawing.value) {
    currentPoint.value = coords;
    draw();
  } else if (mode.value === "select") {
    // Handle endpoint dragging
    if (draggingEndpoint.value !== null) {
      const { lineIndex, endpoint } = draggingEndpoint.value;
      const line = lines.value[lineIndex];

      if (endpoint === 'start') {
        line.x1 = coords.x;
        line.y1 = coords.y;
      } else {
        line.x2 = coords.x;
        line.y2 = coords.y;
      }

      // Recalculate distance and scale
      line.distance = Math.sqrt(
        Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)
      );
      if (line.realValue && line.distance) {
        line.scale = line.realValue / line.distance;
      }

      draw();
    }
    // Handle whole line dragging
    else if (dragging.value && selectedLine.value !== null && dragStart.value) {
      const dx = coords.x - dragStart.value.x;
      const dy = coords.y - dragStart.value.y;
      const { w, h } = getDisplaySize();

      const line = lines.value[selectedLine.value];
      line.x1 = clampInRange(line.x1 + dx, 0, w);
      line.y1 = clampInRange(line.y1 + dy, 0, h);
      line.x2 = clampInRange(line.x2 + dx, 0, w);
      line.y2 = clampInRange(line.y2 + dy, 0, h);

      dragStart.value = coords;
      draw();
    }
  }
};

const handlePointerUp = (e: PointerEvent) => {
  const canvas = canvasRef.value;

  if (e.pointerType === "touch") {
    activeTouchPointers.delete(e.pointerId);
    if (canvas?.hasPointerCapture?.(e.pointerId)) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    if (pinchState) {
      if (activeTouchPointers.size >= 2) {
        updatePinch();
      } else {
        pinchState = null;
      }
      return;
    }
  }

  if (mode.value === "pan" && isPanning.value) {
    isPanning.value = false;
    panStart.value = null;
    if (canvas) {
      canvas.style.cursor = "move";
    }
    return;
  }

  if (mode.value === "draw" && drawing.value && startPoint.value && currentPoint.value) {
    const distance = calculateDistance(startPoint.value, currentPoint.value);

    if (distance > 10) { // Minimum distance to avoid accidental dots
      lines.value.push({
        x1: startPoint.value.x,
        y1: startPoint.value.y,
        x2: currentPoint.value.x,
        y2: currentPoint.value.y,
        distance,
        color: selectedColor.value,
        width: selectedWidth.value
      });

      // Show measurement input modal
      pendingLineIndex.value = lines.value.length - 1;
      showMeasurementModal.value = true;

      draw();
    }
  }

  drawing.value = false;
  dragging.value = false;
  draggingEndpoint.value = null;
  startPoint.value = null;
  currentPoint.value = null;
  dragStart.value = null;
};

const deleteLine = () => {
  if (selectedLine.value !== null) {
    lines.value.splice(selectedLine.value, 1);
    selectedLine.value = null;
    draw();
  }
};

const editLine = () => {
  if (selectedLine.value !== null) {
    pendingLineIndex.value = selectedLine.value;
    showMeasurementModal.value = true;
  }
};

const saveAnnotations = async () => {
  console.log("saveAnnotations called", {
    photoId: props.photoId,
    linesCount: lines.value.length,
    lines: lines.value
  });

  if (!props.photoId || props.photoId === "") {
    console.error("Cannot save: photoId is missing or empty", props.photoId);
    toast.push("Lỗi: không có ID ảnh", "error");
    return;
  }

  if (lines.value.length === 0) {
    console.log("No lines to save, skipping");
    return;
  }

  try {
    // Normalize pixel → 0-1 trước khi lưu (đảm bảo hoạt động cross-device)
    const result = await api.patch(`/photos/${props.photoId}`, {
      annotations: normalizeLines(lines.value)
    });
    if (isOfflineQueuedResponse(result)) {
      saveDraft();
      toast.push("Da luu tam do dac, se dong bo khi co mang", "info");
    } else {
      clearDraft(props.photoId); // Xoá draft sau khi lưu thành công
      toast.push("Đã lưu đo đạc", "success");
      emit("saved");
    }
  } catch (err) {
    console.error("Error saving annotations:", err);
    toast.push((err as Error).message || "Lỗi khi lưu", "error");
  }
};

const exportImage = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  try {
    // Create a download link
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.push("Không thể tạo file ảnh", "error");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `measurement-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push("Đã tải về ảnh", "success");
    });
  } catch (err) {
    console.error("Export error:", err);
    toast.push("Lỗi khi xuất ảnh", "error");
  }
};

const triggerImport = () => {
  if (importFileInput.value) {
    importFileInput.value.click();
  }
};

const downloadExcelTemplate = async () => {
  if (!process.client) return;
  try {
    const XLSX = await import("xlsx");

    // Tạo file Excel mẫu với SheetJS
    // Dữ liệu mẫu
    const templateData = [
      {
        x1: 0.1,
        y1: 0.2,
        x2: 0.3,
        y2: 0.2,
        realValue: 5.5,
        unit: "m",
        name: "Chiều dài tường",
        category: "Kết cấu",
        room: "Phòng khách",
        notes: "Tường bê tông",
        color: "#ef4444",
        width: 2
      },
      {
        x1: 0.4,
        y1: 0.5,
        x2: 0.4,
        y2: 0.7,
        realValue: 3.2,
        unit: "m",
        name: "Chiều cao cột",
        category: "Kết cấu",
        room: "Phòng ngủ",
        notes: "",
        color: "#3b82f6",
        width: 2
      }
    ];

    // Tạo worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Tạo workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu đo đạc");

    // Download file
    XLSX.writeFile(wb, "mau-do-dac.xlsx");

    toast.push("Đã tải xuống file mẫu Excel", "success");
  } catch {
    toast.push("Không thể tạo file mẫu Excel", "error");
  }
};

const handleImportExcel = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!props.photoId) {
    toast.push("Lỗi: không có ID ảnh", "error");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    // mode=append: thêm vào lines hiện tại, mode=replace: thay thế tất cả
    const mode = "append"; // hoặc "replace"

    const response = await api.upload<{
      photo: any;
      imported: number;
      total: number;
    }>(`/photos/${props.photoId}/import-annotations?mode=${mode}`, formData);

    // Reload annotations from response - denormalize 0-1 → pixel
    if (response.photo && response.photo.annotations) {
      const normalized = (response.photo.annotations as Line[]).map(migrateLine).map(toNormalizedLine);
      lines.value = denormalizeLines(normalized);
      draw();
      toast.push(`Đã import ${response.imported} đường đo`, "success");
      emit("saved");
    }
  } catch (err) {
    console.error("Import error:", err);
    toast.push((err as Error).message || "Lỗi khi import Excel", "error");
  } finally {
    input.value = "";
  }
};

// Measurement modal handlers
// Helper: Parse distance string to value + unit
const parseDistance = (distanceStr: string): { value: number | undefined; unit: string | undefined } => {
  if (!distanceStr) return { value: undefined, unit: undefined };

  // Try to match pattern like "2.5m", "150cm", "2 feet"
  const match = distanceStr.trim().match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2] || undefined;
    return { value: isNaN(value) ? undefined : value, unit };
  }

  return { value: undefined, unit: undefined };
};

const handleMeasurementSave = (data: {
  name: string;
  distance: string;
  category?: string;
  room?: string;
  notes?: string;
}) => {
  console.log("handleMeasurementSave", { data, pendingLineIndex: pendingLineIndex.value });

  if (pendingLineIndex.value !== null && lines.value[pendingLineIndex.value]) {
    const line = lines.value[pendingLineIndex.value];

    // Parse distance to get realValue and unit
    const { value, unit } = parseDistance(data.distance);

    // Save all fields to line
    line.name = data.name || undefined;
    line.realDistance = data.distance || undefined;  // Keep legacy field
    line.realValue = value;
    line.unit = unit;
    line.category = data.category;
    line.room = data.room;
    line.notes = data.notes;
    line.createdAt = Date.now();

    // Calculate scale if we have both values
    if (line.realValue && line.distance > 0) {
      line.scale = line.realValue / line.distance;
    }

    // Add to history
    annotationHistory.addMeasurement({
      id: `${Date.now()}-${Math.random()}`,
      photoId: props.photoId,
      pixelDistance: line.distance,
      realDistance: data.distance,
      timestamp: Date.now(),
      color: line.color,
      width: line.width
    });

    console.log("Measurement saved to line and history");
  }

  // Close modal and reset
  showMeasurementModal.value = false;
  pendingLineIndex.value = null;
  draw();
};

const handleMeasurementCancel = () => {
  console.log("handleMeasurementCancel - measurement skipped");

  // Close modal and reset
  showMeasurementModal.value = false;
  pendingLineIndex.value = null;
};

// Watch for show changes
watch(() => props.show, (newVal, oldVal) => {
  console.log("Watch props.show", { newVal, oldVal, photoId: props.photoId });

  if (newVal && !oldVal) {
    // Cache photoId khi mở
    cachedPhotoId.value = props.photoId;

    // Reset pan/zoom
    panOffset.value = { x: 0, y: 0 };
    zoomLevel.value = 1;
    isPanning.value = false;
    panStart.value = null;
    activeTouchPointers.clear();
    pinchState = null;

    // Chỉ load khi mở modal (từ false → true)
    nextTick(() => {
      loadImage();
      startAutosave();
      window.addEventListener("resize", handleResize);
    });
  } else if (!newVal && oldVal) {
    // Khi đóng modal (từ true → false)
    stopAutosave();
    window.removeEventListener("resize", handleResize);
    activeTouchPointers.clear();
    pinchState = null;
    // Auto-save nếu có lines và có photoId
    if (lines.value.length > 0 && cachedPhotoId.value) {
      const photoIdToSave = cachedPhotoId.value;
      if (photoIdToSave) {
        api.patch(`/photos/${photoIdToSave}`, {
          annotations: normalizeLines(lines.value)
        }).then((result) => {
          if (isOfflineQueuedResponse(result)) {
            saveDraft();
            console.log("Queued annotations on close");
            return;
          }
          clearDraft(photoIdToSave); // Xoá draft sau khi lưu thành công
          console.log("Auto-saved annotations on close");
          emit("saved");
        }).catch((err) => {
          // Lưu server lỗi → giữ draft trong localStorage để recover sau
          saveDraft();
          console.error("Error auto-saving annotations:", err);
        });
      }
    }
  }
}, { immediate: false });

</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
