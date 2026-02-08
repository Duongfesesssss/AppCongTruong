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
            ></canvas>

            <!-- Instructions overlay -->
            <div v-if="lines.length === 0" class="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div class="rounded-lg bg-black/60 px-4 py-3 text-center text-sm text-white backdrop-blur-sm">
                <p class="font-medium">Chạm và kéo để vẽ đường đo</p>
                <p class="mt-1 text-xs opacity-75">Khoảng cách sẽ hiển thị tự động</p>
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
import { useApi } from "~/composables/api/useApi";
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
const panOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref<{ x: number; y: number } | null>(null);

// Drawing state
const drawing = ref(false);
const startPoint = ref<{ x: number; y: number } | null>(null);
const currentPoint = ref<{ x: number; y: number } | null>(null);

// Dragging state (for moving selected line)
const dragging = ref(false);
const dragStart = ref<{ x: number; y: number } | null>(null);

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

// Migration: Convert legacy Line to new format
const migrateLine = (line: Line): Line => {
  const migrated = { ...line };

  // Ensure distance is calculated
  if (!migrated.distance) {
    migrated.distance = Math.sqrt(
      Math.pow(migrated.x2 - migrated.x1, 2) + Math.pow(migrated.y2 - migrated.y1, 2)
    );
  }

  // Parse realDistance to get realValue + unit if not already present
  if (migrated.realDistance && !migrated.realValue) {
    const { value, unit } = parseDistance(migrated.realDistance);
    migrated.realValue = value;
    migrated.unit = unit;
  }

  // Calculate scale if we have both values
  if (migrated.realValue && migrated.distance > 0 && !migrated.scale) {
    migrated.scale = migrated.realValue / migrated.distance;
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
    if (props.initialAnnotations && props.initialAnnotations.length > 0) {
      // Migrate all annotations to new format
      lines.value = props.initialAnnotations.map(migrateLine);
      console.log("Loaded and migrated annotations:", lines.value);
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

  // Apply pan offset
  context.translate(panOffset.value.x, panOffset.value.y);

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
  context.fillStyle = lineColor;
  context.beginPath();
  context.arc(line.x1, line.y1, 6, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(line.x2, line.y2, 6, 0, Math.PI * 2);
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
  const canvas = canvasRef.value;
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  // Get display size (CSS size)
  const displayWidth = parseFloat(canvas.style.width) || canvas.width;
  const displayHeight = parseFloat(canvas.style.height) || canvas.height;

  // Calculate coords accounting for pan offset
  const x = ((e.clientX - rect.left) / rect.width) * displayWidth - panOffset.value.x;
  const y = ((e.clientY - rect.top) / rect.height) * displayHeight - panOffset.value.y;

  return { x, y };
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
  } else if (mode.value === "select" && dragging.value && selectedLine.value !== null && dragStart.value) {
    const dx = coords.x - dragStart.value.x;
    const dy = coords.y - dragStart.value.y;

    const line = lines.value[selectedLine.value];
    line.x1 += dx;
    line.y1 += dy;
    line.x2 += dx;
    line.y2 += dy;

    dragStart.value = coords;
    draw();
  }
};

const handlePointerUp = () => {
  const canvas = canvasRef.value;

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
    await api.patch(`/photos/${props.photoId}`, {
      annotations: lines.value
    });
    toast.push("Đã lưu đo đạc", "success");
    emit("saved");
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

    // Reload annotations from response
    if (response.photo && response.photo.annotations) {
      lines.value = response.photo.annotations.map((line: any) => {
        // Convert normalized coordinates to pixel coordinates
        if (!image.value) return line;

        const imgWidth = image.value.width;
        const imgHeight = image.value.height;

        return {
          ...line,
          x1: line.x1 * imgWidth,
          y1: line.y1 * imgHeight,
          x2: line.x2 * imgWidth,
          y2: line.y2 * imgHeight,
          distance: Math.sqrt(
            Math.pow(line.x2 * imgWidth - line.x1 * imgWidth, 2) +
            Math.pow(line.y2 * imgHeight - line.y1 * imgHeight, 2)
          )
        };
      });

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

    // Reset pan offset
    panOffset.value = { x: 0, y: 0 };
    isPanning.value = false;
    panStart.value = null;

    // Chỉ load khi mở modal (từ false → true)
    nextTick(() => {
      loadImage();
      window.addEventListener("resize", resizeCanvas);
    });
  } else if (!newVal && oldVal) {
    // Khi đóng modal (từ true → false)
    window.removeEventListener("resize", resizeCanvas);
    // Auto-save nếu có lines và có photoId
    if (lines.value.length > 0 && cachedPhotoId.value) {
      // Use cached photoId instead of props.photoId
      const photoIdToSave = cachedPhotoId.value;
      if (photoIdToSave) {
        api.patch(`/photos/${photoIdToSave}`, {
          annotations: lines.value
        }).then(() => {
          console.log("Auto-saved annotations on close");
          emit("saved");
        }).catch((err) => {
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
