<template>
  <div class="relative h-full rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-3">
      <div class="min-w-0">
        <p class="text-[10px] uppercase tracking-widest text-slate-400 sm:text-xs">Plan View</p>
        <h2 class="truncate text-sm font-semibold text-slate-900 sm:text-base">{{ drawingTitle }}</h2>
      </div>
      <div class="flex items-center gap-1 sm:gap-2">
        <button class="btn" title="Thu nhỏ" @click="zoomOut">−</button>
        <button class="btn min-w-[54px]" title="Reset view" @click="resetView">{{ Math.round(zoom * 100) }}%</button>
        <button class="btn" title="Phóng to" @click="zoomIn">+</button>
        <button class="btn hidden sm:inline-flex" @click="resetView">Reset</button>
      </div>
    </div>

    <div
      v-if="placingPin"
      class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700 sm:px-4 sm:py-2 sm:text-xs"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span class="font-medium">Nhấn vào bản vẽ để đặt pin</span>
      <button
        class="ml-auto rounded bg-amber-200 px-2 py-0.5 text-amber-800 hover:bg-amber-300"
        @click="emit('cancel-place')"
      >
        Huỷ
      </button>
    </div>

    <div
      ref="viewportRef"
      class="relative h-[55vh] overflow-hidden bg-slate-50 sm:h-[70vh]"
      style="touch-action: pan-y pinch-zoom"
      @wheel="handleWheel"
      @pointerdown="handleViewportPointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    >
      <div v-if="loading" class="flex h-full items-center justify-center text-sm text-slate-500">
        Đang tải bản vẽ...
      </div>
      <div v-else-if="error" class="flex h-full items-center justify-center text-sm text-rose-600">
        {{ error }}
      </div>
      <div v-else-if="!drawing" class="flex h-full items-center justify-center text-sm text-slate-500">
        Chọn bản vẽ từ cây thư mục để xem.
      </div>
      <div
        v-else
        class="h-full w-full"
        :class="placingPin ? 'cursor-crosshair' : 'cursor-default'"
      >
        <div ref="contentRef" class="relative" :style="transformStyle">
          <div ref="pdfContainerRef" class="pointer-events-none relative w-full select-none">
            <div v-if="pdfRendering && !pdfHasContent" class="flex items-center justify-center py-12">
              <svg class="mr-2 h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="text-sm text-slate-500">Đang tải PDF...</span>
            </div>
          </div>

          <div
            class="absolute inset-0"
            :class="[
              'pointer-events-auto z-10',
              placingPin && 'cursor-crosshair',
              draggingPinId && 'cursor-grabbing'
            ]"
            @click.self="handleOverlayClick"
            @mousemove.self="updateGhostPin"
            @mouseleave="ghostPin = null"
          >
            <div
              v-if="placingPin && ghostPin"
              class="pointer-events-none absolute flex items-center justify-center rounded-full border-2 border-dashed border-brand-400 bg-brand-500/60 text-white shadow-lg animate-pulse"
              :style="ghostPinStyle(ghostPin)"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
              </svg>
            </div>

            <div
              v-for="pin in pins"
              :key="pin._id || pin.id"
              class="pin-element pointer-events-auto absolute flex items-center justify-center rounded-full border-2 font-bold text-white shadow-lg transition-all duration-100"
              :class="[
                pinBg(pin.status),
                isSelected(pin) ? 'ring-2 ring-offset-1 ring-brand-400 border-white z-20' : 'border-white',
                !placingPin && !draggingPinId ? 'cursor-pointer pin-hoverable' : '',
                draggingPinId === (pin._id || pin.id) ? 'cursor-grabbing opacity-80 z-30' : ''
              ]"
              :style="pinStyle(pin)"
              :title="pin.pinName || pin.pinCode || 'Pin'"
              @click.stop="handlePinClick(pin)"
              @pointerdown.stop="startPinDrag($event, pin)"
            >
              •
            </div>

            <div
              v-for="zone in zones"
              :key="zone._id || zone.id"
              class="pointer-events-auto absolute cursor-pointer rounded border-2 border-dashed"
              :class="zoneClass(zone.status)"
              :style="zoneStyle(zone.shape)"
              @click.stop="emit('zone-click', zone)"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Drawing = { _id?: string; id?: string; name?: string } | null;

type Pin = {
  _id?: string;
  id?: string;
  pinX: number;
  pinY: number;
  status: string;
  pinName?: string;
  pinCode?: string;
};

type Zone = {
  _id?: string;
  id?: string;
  status: string;
  shape?: { x?: number; y?: number; width?: number; height?: number };
};

const props = defineProps<{
  drawing: Drawing;
  pins: Pin[];
  zones: Zone[];
  loading: boolean;
  error: string;
  placingPin?: boolean;
  selectedPinId?: string;
}>();

const emit = defineEmits<{
  (e: "pin-click", pin: Pin): void;
  (e: "zone-click", zone: Zone): void;
  (e: "place-pin", coords: { pinX: number; pinY: number }): void;
  (e: "pin-move", data: { pinId: string; pinX: number; pinY: number }): void;
  (e: "cancel-place"): void;
}>();

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.2;
const PIN_BASE_SCREEN_SIZE_PX = 22;
const PIN_MIN_SCREEN_SIZE_PX = 16;
const PIN_MAX_SCREEN_SIZE_PX = 30;
const PIN_SCREEN_ADJUST_POWER = 0.15;
const PIN_DRAG_THRESHOLD_PX = 4;
const MAX_CANVAS_DIMENSION = 12288;
const MAX_QUALITY_SCALE = 10;
const SHARPEN_DEBOUNCE_MS = 220;
const VIEW_SAFE_MARGIN = 48;
const WHEEL_ZOOM_REQUIRES_SHIFT = true;

const viewportRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const pdfContainerRef = ref<HTMLElement | null>(null);
const pdfRendering = ref(false);
const pdfHasContent = ref(false);

const zoom = ref(1);
const offset = reactive({ x: 0, y: 0 });
const panning = ref(false);
const panStart = reactive({ x: 0, y: 0 });
const panOrigin = reactive({ x: 0, y: 0 });
const didPan = ref(false);

const draggingPinId = ref<string | null>(null);
const draggingPinPos = ref<{ x: number; y: number } | null>(null);
const pinDragMoved = ref(false);
const pinDragStartClient = ref<{ x: number; y: number } | null>(null);

const ghostPin = ref<{ x: number; y: number } | null>(null);

const drawingTitle = computed(() => props.drawing?.name || "Chưa chọn bản vẽ");
const token = useState<string | null>("auth-token", () => null);
const fileUrl = computed(() => {
  if (!props.drawing) return "";
  const id = props.drawing._id || props.drawing.id;
  const base = `${useRuntimeConfig().public.apiBase}/drawings/${id}/file`;
  return token.value ? `${base}?token=${encodeURIComponent(token.value)}` : base;
});

const transformStyle = computed(() => ({
  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom.value})`,
  transformOrigin: "top left"
}));

const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
const clampZoom = (v: number) => Math.min(Math.max(v, MIN_ZOOM), MAX_ZOOM);
const clampInRange = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const pinZoomFactor = computed(() => Math.max(zoom.value, MIN_ZOOM));

const pinScreenSizePx = computed(() => {
  // Giu kich thuoc pin tren man hinh on dinh, tranh qua to khi zoom lon.
  const adjustedScreenSize = PIN_BASE_SCREEN_SIZE_PX * Math.pow(1 / pinZoomFactor.value, PIN_SCREEN_ADJUST_POWER);
  return clampInRange(adjustedScreenSize, PIN_MIN_SCREEN_SIZE_PX, PIN_MAX_SCREEN_SIZE_PX);
});

const pinBaseSizePx = computed(() => {
  // Counter-scale pin theo zoom để giữ kích thước màn hình ổn định hơn.
  return pinScreenSizePx.value / pinZoomFactor.value;
});

const pinFontSizePx = computed(() => {
  const screenFontSize = clampInRange(pinScreenSizePx.value * 0.45, 8, 12);
  return screenFontSize / pinZoomFactor.value;
});

const normalizedCoords = (event: PointerEvent | MouseEvent): { x: number; y: number } | null => {
  const el = contentRef.value;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
};

const clampOffsetToViewport = () => {
  const viewport = viewportRef.value;
  const content = contentRef.value;
  if (!viewport || !content) return;

  const scale = zoom.value;
  const contentWidth = Math.max(1, content.offsetWidth * scale);
  const contentHeight = Math.max(1, content.offsetHeight * scale);
  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;

  let minX = viewportWidth - contentWidth - VIEW_SAFE_MARGIN;
  let maxX = VIEW_SAFE_MARGIN;
  if (contentWidth <= viewportWidth) {
    const centerX = (viewportWidth - contentWidth) / 2;
    minX = centerX;
    maxX = centerX;
  }

  let minY = viewportHeight - contentHeight - VIEW_SAFE_MARGIN;
  let maxY = VIEW_SAFE_MARGIN;
  if (contentHeight <= viewportHeight) {
    const centerY = (viewportHeight - contentHeight) / 2;
    minY = centerY;
    maxY = centerY;
  }

  offset.x = clampInRange(offset.x, minX, maxX);
  offset.y = clampInRange(offset.y, minY, maxY);
};

const applyZoom = (targetZoom: number, anchorClient?: { x: number; y: number }) => {
  const viewport = viewportRef.value;
  const nextZoom = clampZoom(targetZoom);
  const prevZoom = zoom.value;
  if (!viewport || prevZoom === nextZoom) {
    zoom.value = nextZoom;
    return;
  }

  const rect = viewport.getBoundingClientRect();
  const anchorX = anchorClient?.x ?? rect.left + rect.width / 2;
  const anchorY = anchorClient?.y ?? rect.top + rect.height / 2;

  const viewportX = anchorX - rect.left;
  const viewportY = anchorY - rect.top;
  const worldX = (viewportX - offset.x) / prevZoom;
  const worldY = (viewportY - offset.y) / prevZoom;

  zoom.value = nextZoom;
  offset.x = viewportX - worldX * nextZoom;
  offset.y = viewportY - worldY * nextZoom;
  clampOffsetToViewport();
  scheduleDetailRender(SHARPEN_DEBOUNCE_MS);
};

const zoomIn = () => {
  applyZoom(zoom.value + ZOOM_STEP);
};

const zoomOut = () => {
  applyZoom(zoom.value - ZOOM_STEP);
};

const resetView = () => {
  zoom.value = 1;
  offset.x = 0;
  offset.y = 0;
  nextTick(() => {
    clampOffsetToViewport();
  });
  scheduleDetailRender(0);
};

const handleWheel = (event: WheelEvent) => {
  if (!event.ctrlKey && !event.metaKey) return;
  if (WHEEL_ZOOM_REQUIRES_SHIFT && !event.shiftKey) return;
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  applyZoom(zoom.value * factor, { x: event.clientX, y: event.clientY });
};

const startPan = (event: PointerEvent) => {
  if (draggingPinId.value) return;
  didPan.value = false;
  panning.value = true;
  panStart.x = event.clientX;
  panStart.y = event.clientY;
  panOrigin.x = offset.x;
  panOrigin.y = offset.y;
};

const handleViewportPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return;
  const target = event.target as HTMLElement;
  if (props.placingPin) return;
  if (target.closest(".pin-element")) return;
  startPan(event);
};

const handlePointerMove = (event: PointerEvent) => {
  if (draggingPinId.value) {
    if (!pinDragStartClient.value) return;
    const deltaX = event.clientX - pinDragStartClient.value.x;
    const deltaY = event.clientY - pinDragStartClient.value.y;
    const movedEnough = Math.hypot(deltaX, deltaY) >= PIN_DRAG_THRESHOLD_PX;

    if (!pinDragMoved.value && !movedEnough) {
      event.preventDefault();
      return;
    }

    const coords = normalizedCoords(event);
    if (coords) {
      draggingPinPos.value = coords;
      pinDragMoved.value = true;
    }
    event.preventDefault();
    return;
  }

  if (!panning.value) return;
  const dx = event.clientX - panStart.x;
  const dy = event.clientY - panStart.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.value = true;
  offset.x = panOrigin.x + dx;
  offset.y = panOrigin.y + dy;
  clampOffsetToViewport();
  scheduleDetailRender(90);
};

const handlePointerUp = () => {
  if (draggingPinId.value) {
    if (pinDragMoved.value && draggingPinPos.value) {
      emit("pin-move", {
        pinId: draggingPinId.value,
        pinX: draggingPinPos.value.x,
        pinY: draggingPinPos.value.y
      });
    }
    draggingPinId.value = null;
    draggingPinPos.value = null;
    pinDragMoved.value = false;
    pinDragStartClient.value = null;
    return;
  }

  panning.value = false;
  if (didPan.value) {
    setTimeout(() => {
      didPan.value = false;
    }, 0);
    scheduleDetailRender(60);
  }
};

const handleOverlayClick = (event: MouseEvent) => {
  if (!props.placingPin || didPan.value) return;
  const coords = normalizedCoords(event);
  if (!coords) return;
  emit("place-pin", { pinX: coords.x, pinY: coords.y });
};

const updateGhostPin = (event: MouseEvent) => {
  if (!props.placingPin) {
    ghostPin.value = null;
    return;
  }
  const coords = normalizedCoords(event);
  ghostPin.value = coords;
};

const handlePinClick = (pin: Pin) => {
  if (props.placingPin || didPan.value || pinDragMoved.value) return;
  emit("pin-click", pin);
};

const startPinDrag = (event: PointerEvent, pin: Pin) => {
  if (props.placingPin) return;
  const id = pin._id || pin.id;
  if (!id) return;

  draggingPinId.value = id;
  pinDragMoved.value = false;
  pinDragStartClient.value = { x: event.clientX, y: event.clientY };
  draggingPinPos.value = {
    x: clamp(pin.pinX),
    y: clamp(pin.pinY)
  };

  event.preventDefault();
};

const pinPos = (pin: Pin) => {
  const id = pin._id || pin.id;
  if (draggingPinId.value === id && draggingPinPos.value) {
    return {
      left: `${draggingPinPos.value.x * 100}%`,
      top: `${draggingPinPos.value.y * 100}%`
    };
  }
  return {
    left: `${clamp(pin.pinX) * 100}%`,
    top: `${clamp(pin.pinY) * 100}%`
  };
};

const pinRenderScale = (pin: Pin) => {
  const id = pin._id || pin.id;
  let scale = 1;
  if (isSelected(pin)) scale *= 1.14;
  if (draggingPinId.value === id) scale *= 1.2;
  return scale;
};

const pinStyle = (pin: Pin) => {
  const basePos = pinPos(pin);
  const size = pinBaseSizePx.value;
  return {
    ...basePos,
    "--pin-scale": `${pinRenderScale(pin)}`,
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${pinFontSizePx.value}px`,
    transform: "translate(-50%, -50%) scale(var(--pin-scale))"
  };
};

const ghostPinStyle = (point: { x: number; y: number }) => {
  const size = pinBaseSizePx.value;
  return {
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`,
    width: `${size}px`,
    height: `${size}px`,
    transform: "translate(-50%, -50%)"
  };
};

const isSelected = (pin: Pin) => {
  const id = pin._id || pin.id;
  return id && id === props.selectedPinId;
};

const pinBg = (status: string) => {
  if (status === "done") return "bg-emerald-500";
  if (status === "blocked") return "bg-rose-500";
  if (status === "in_progress") return "bg-amber-500";
  return "bg-brand-500";
};

const zoneClass = (status: string) => {
  if (status === "done") return "border-emerald-500 bg-emerald-100/40";
  if (status === "in_progress") return "border-amber-500 bg-amber-100/40";
  return "border-brand-500 bg-brand-100/30";
};

const zoneStyle = (shape?: Zone["shape"]) => ({
  left: `${clamp(shape?.x ?? 0) * 100}%`,
  top: `${clamp(shape?.y ?? 0) * 100}%`,
  width: `${clamp(shape?.width ?? 0) * 100}%`,
  height: `${clamp(shape?.height ?? 0) * 100}%`
});

let pdfjsLibPromise: Promise<any> | null = null;
let currentPdfTask: any = null;
let currentPdfDoc: any = null;
let currentPdfPage: any = null;
let currentPdfUrl = "";
let renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let detailRenderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let renderingInProgress = false;
let queuedRender = false;
let renderToken = 0;
let detailRenderToken = 0;
let currentDetailRenderTask: any = null;
let pageBaseMetrics: { fitScale: number; width: number; height: number } | null = null;
let baseCanvasEl: HTMLCanvasElement | null = null;
let detailCanvasEl: HTMLCanvasElement | null = null;
let viewportResizeObserver: ResizeObserver | null = null;

const getPdfJsLib = async () => {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc =
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;
      return lib;
    });
  }
  return pdfjsLibPromise;
};

const cancelDetailRenderTask = () => {
  if (!currentDetailRenderTask) return;
  try {
    currentDetailRenderTask.cancel();
  } catch {
    // ignore
  }
  currentDetailRenderTask = null;
};

const clearRenderedCanvases = (container: HTMLElement) => {
  if (detailRenderDebounceTimer) {
    clearTimeout(detailRenderDebounceTimer);
    detailRenderDebounceTimer = null;
  }
  cancelDetailRenderTask();
  const canvases = container.querySelectorAll("canvas");
  canvases.forEach((canvas) => canvas.remove());
  baseCanvasEl = null;
  detailCanvasEl = null;
  pageBaseMetrics = null;
  pdfHasContent.value = false;
};

const ensureBaseCanvas = (container: HTMLElement) => {
  if (!baseCanvasEl || !container.contains(baseCanvasEl)) {
    baseCanvasEl = document.createElement("canvas");
    baseCanvasEl.style.display = "block";
    baseCanvasEl.style.position = "relative";
    baseCanvasEl.style.zIndex = "1";
    container.appendChild(baseCanvasEl);
  }
  return baseCanvasEl;
};

const ensureDetailCanvas = (container: HTMLElement) => {
  if (!detailCanvasEl || !container.contains(detailCanvasEl)) {
    detailCanvasEl = document.createElement("canvas");
    detailCanvasEl.style.position = "absolute";
    detailCanvasEl.style.left = "0";
    detailCanvasEl.style.top = "0";
    detailCanvasEl.style.zIndex = "2";
    detailCanvasEl.style.pointerEvents = "none";
    container.appendChild(detailCanvasEl);
  }
  return detailCanvasEl;
};

const destroyCurrentPdfTask = () => {
  if (!currentPdfTask) return;
  try {
    currentPdfTask.destroy();
  } catch {
    // ignore
  }
  currentPdfTask = null;
};

const destroyCurrentPdfDoc = async () => {
  currentPdfPage = null;
  pageBaseMetrics = null;
  baseCanvasEl = null;
  detailCanvasEl = null;
  cancelDetailRenderTask();
  if (!currentPdfDoc) return;
  try {
    await currentPdfDoc.destroy();
  } catch {
    // ignore
  }
  currentPdfDoc = null;
};

const loadPdfDocument = async () => {
  if (!process.client) return;
  const url = fileUrl.value;
  if (!url) {
    currentPdfUrl = "";
    destroyCurrentPdfTask();
    await destroyCurrentPdfDoc();
    const container = pdfContainerRef.value;
    if (container) clearRenderedCanvases(container);
    return;
  }
  if (url === currentPdfUrl && currentPdfDoc) return;

  const pdfjsLib = await getPdfJsLib();
  destroyCurrentPdfTask();
  await destroyCurrentPdfDoc();

  currentPdfTask = pdfjsLib.getDocument(url);
  currentPdfDoc = await currentPdfTask.promise;
  currentPdfUrl = url;
};

const renderLoadedPdf = async () => {
  const container = pdfContainerRef.value;
  if (!container || !currentPdfDoc) return;

  if (renderingInProgress) {
    queuedRender = true;
    return;
  }

  renderingInProgress = true;
  pdfRendering.value = true;
  const localRenderToken = ++renderToken;

  try {
    const doc = currentPdfDoc;
    const viewportWidth = viewportRef.value?.clientWidth ?? container.clientWidth ?? 800;
    const targetWidth = Math.max(480, Math.min(viewportWidth, 1200));

    // Task pin hiện tại không có pageIndex, nên luôn render trang đầu để đảm bảo sync toạ độ tuyệt đối.
    const page = await doc.getPage(1);
    currentPdfPage = page;
    const naturalViewport = page.getViewport({ scale: 1 });
    const fitScale = targetWidth / naturalViewport.width;
    const baseViewport = page.getViewport({ scale: fitScale });
    const basePixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);

    if (localRenderToken !== renderToken) return;
    clearRenderedCanvases(container);

    const baseCanvas = ensureBaseCanvas(container);
    baseCanvas.width = Math.max(1, Math.floor(baseViewport.width * basePixelRatio));
    baseCanvas.height = Math.max(1, Math.floor(baseViewport.height * basePixelRatio));
    baseCanvas.style.width = `${Math.floor(baseViewport.width)}px`;
    baseCanvas.style.height = `${Math.floor(baseViewport.height)}px`;

    const baseContext = baseCanvas.getContext("2d");
    if (!baseContext) return;

    await page.render({
      canvasContext: baseContext,
      viewport: baseViewport,
      transform: basePixelRatio === 1 ? undefined : [basePixelRatio, 0, 0, basePixelRatio, 0, 0]
    }).promise;

    if (localRenderToken !== renderToken) return;
    pageBaseMetrics = {
      fitScale,
      width: Math.floor(baseViewport.width),
      height: Math.floor(baseViewport.height)
    };
    ensureDetailCanvas(container);
    pdfHasContent.value = true;
    nextTick(() => {
      clampOffsetToViewport();
      void renderVisibleTile();
    });
  } catch (err: any) {
    if (err?.name !== "RenderingCancelledException") {
      console.error("PDF render error:", err);
    }
  } finally {
    renderingInProgress = false;
    pdfRendering.value = false;

    if (queuedRender) {
      queuedRender = false;
      void renderLoadedPdf();
    }
  }
};

const renderVisibleTile = async () => {
  const container = pdfContainerRef.value;
  const viewport = viewportRef.value;
  if (!container || !viewport || !currentPdfPage || !pageBaseMetrics) return;

  const metrics = pageBaseMetrics;
  const safeZoom = Math.max(zoom.value, MIN_ZOOM);
  const paddingScreen = 220;
  const paddingWorld = paddingScreen / safeZoom;

  const left = clampInRange((-offset.x) / safeZoom - paddingWorld, 0, metrics.width);
  const top = clampInRange((-offset.y) / safeZoom - paddingWorld, 0, metrics.height);
  const right = clampInRange((viewport.clientWidth - offset.x) / safeZoom + paddingWorld, 0, metrics.width);
  const bottom = clampInRange((viewport.clientHeight - offset.y) / safeZoom + paddingWorld, 0, metrics.height);

  if (right <= left || bottom <= top) {
    if (detailCanvasEl) detailCanvasEl.style.display = "none";
    return;
  }

  const tileWorldWidth = Math.max(1, right - left);
  const tileWorldHeight = Math.max(1, bottom - top);
  const deviceScale = Math.min(window.devicePixelRatio || 1, 1.5);
  let qualityScale = Math.max(1, Math.min(safeZoom, MAX_QUALITY_SCALE));

  const maxPixelCurrent = Math.max(
    tileWorldWidth * qualityScale * deviceScale,
    tileWorldHeight * qualityScale * deviceScale
  );
  if (maxPixelCurrent > MAX_CANVAS_DIMENSION) {
    const shrinkRatio = MAX_CANVAS_DIMENSION / maxPixelCurrent;
    qualityScale = Math.max(1, qualityScale * shrinkRatio);
  }

  const tileViewport = currentPdfPage.getViewport({ scale: metrics.fitScale * qualityScale });
  const pixelWidth = Math.max(1, Math.floor(tileWorldWidth * qualityScale * deviceScale));
  const pixelHeight = Math.max(1, Math.floor(tileWorldHeight * qualityScale * deviceScale));

  const tileCanvas = ensureDetailCanvas(container);
  tileCanvas.style.display = "block";
  tileCanvas.style.left = `${Math.floor(left)}px`;
  tileCanvas.style.top = `${Math.floor(top)}px`;
  tileCanvas.style.width = `${Math.floor(tileWorldWidth)}px`;
  tileCanvas.style.height = `${Math.floor(tileWorldHeight)}px`;
  tileCanvas.width = pixelWidth;
  tileCanvas.height = pixelHeight;

  const tileContext = tileCanvas.getContext("2d");
  if (!tileContext) return;

  cancelDetailRenderTask();
  const localToken = ++detailRenderToken;
  currentDetailRenderTask = currentPdfPage.render({
    canvasContext: tileContext,
    viewport: tileViewport,
    transform: [
      deviceScale,
      0,
      0,
      deviceScale,
      -left * qualityScale * deviceScale,
      -top * qualityScale * deviceScale
    ]
  });

  try {
    await currentDetailRenderTask.promise;
  } catch (err: any) {
    if (err?.name !== "RenderingCancelledException") {
      console.error("PDF tile render error:", err);
    }
  } finally {
    if (localToken === detailRenderToken) {
      currentDetailRenderTask = null;
    }
  }
};

const scheduleDetailRender = (delayMs = SHARPEN_DEBOUNCE_MS) => {
  if (detailRenderDebounceTimer) {
    clearTimeout(detailRenderDebounceTimer);
    detailRenderDebounceTimer = null;
  }

  if (delayMs <= 0) {
    void renderVisibleTile();
    return;
  }

  detailRenderDebounceTimer = setTimeout(() => {
    detailRenderDebounceTimer = null;
    void renderVisibleTile();
  }, delayMs);
};

const schedulePdfRender = (delayMs = 0) => {
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = null;
  }

  if (delayMs <= 0) {
    void renderLoadedPdf();
    return;
  }

  renderDebounceTimer = setTimeout(() => {
    renderDebounceTimer = null;
    void renderLoadedPdf();
  }, delayMs);
};

const reloadPdfAndRender = async () => {
  try {
    await loadPdfDocument();
    await renderLoadedPdf();
  } catch (err: any) {
    if (err?.name !== "RenderingCancelledException") {
      console.error("PDF load error:", err);
    }
  }
};

const handleWindowResize = () => {
  schedulePdfRender(160);
};

watch(
  () => props.drawing?._id || props.drawing?.id || "",
  () => {
    resetView();
    draggingPinId.value = null;
    draggingPinPos.value = null;
    pinDragMoved.value = false;
    pinDragStartClient.value = null;
    ghostPin.value = null;
  }
);

watch(
  () => fileUrl.value,
  () => {
    nextTick(() => {
      void reloadPdfAndRender();
    });
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener("resize", handleWindowResize);

  if (typeof ResizeObserver !== "undefined" && viewportRef.value) {
    viewportResizeObserver = new ResizeObserver(() => {
      schedulePdfRender(120);
    });
    viewportResizeObserver.observe(viewportRef.value);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleWindowResize);
  if (viewportResizeObserver) {
    viewportResizeObserver.disconnect();
    viewportResizeObserver = null;
  }
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = null;
  }
  if (detailRenderDebounceTimer) {
    clearTimeout(detailRenderDebounceTimer);
    detailRenderDebounceTimer = null;
  }
  cancelDetailRenderTask();
  destroyCurrentPdfTask();
  void destroyCurrentPdfDoc();
});
</script>

<style scoped>
.btn {
  @apply rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100;
}

canvas {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: high-quality;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.pin-hoverable:hover {
  transform: translate(-50%, -50%) scale(calc(var(--pin-scale, 1) * 1.12)) !important;
}
</style>
