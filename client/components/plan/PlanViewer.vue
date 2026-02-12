<template>
  <div class="relative h-full rounded-2xl border border-slate-200 bg-white shadow-sm">
    <!-- Header -->
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

    <!-- Placement mode banner -->
    <div
      v-if="placingPin"
      class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700 sm:px-4 sm:py-2 sm:text-xs"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span class="font-medium">Nhấn vào bản vẽ để đặt pin</span>
      <button
        class="ml-auto rounded bg-amber-200 px-2 py-0.5 text-amber-800 hover:bg-amber-300"
        @click="emit('cancel-place')"
      >
        Huỷ
      </button>
    </div>

    <!-- Drawing viewport -->
    <div
      ref="viewportRef"
      class="relative overflow-auto bg-slate-50"
      style="touch-action: pan-y pinch-zoom"
      :class="placingPin ? 'h-[50vh] sm:h-[65vh]' : 'h-[55vh] sm:h-[70vh]'"
      @wheel.prevent="handleWheel"
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
          <!-- PDF rendered via PDF.js canvas - hoạt động trên cả mobile -->
          <div ref="pdfContainerRef" class="w-full">
            <div v-if="pdfRendering" class="flex items-center justify-center py-12">
              <svg class="h-5 w-5 animate-spin text-slate-400 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="text-sm text-slate-500">Đang tải PDF...</span>
            </div>
          </div>

          <!-- Overlay: pins, zones, placement catcher - height sync với PDF qua JS -->
          <div
            ref="overlayRef"
            class="absolute inset-0"
            :class="[
              placingPin || draggingPinId ? 'pointer-events-auto z-10' : 'pointer-events-none',
              placingPin && 'cursor-crosshair',
              draggingPinId && 'cursor-grabbing'
            ]"
            @click.self="handleOverlayClick"
            @mousemove.self="updateGhostPin"
            @mouseleave="ghostPin = null"
          >
            <!-- Ghost pin -->
            <div
              v-if="placingPin && ghostPin"
              class="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-brand-400 bg-brand-500/60 text-white shadow-lg animate-pulse"
              :style="{ left: `${ghostPin.x * 100}%`, top: `${ghostPin.y * 100}%` }"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
              </svg>
            </div>

            <!-- Existing pins (draggable) -->
            <div
              v-for="pin in pins"
              :key="pin._id || pin.id"
              class="pin-element pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-bold text-white shadow-lg transition-all duration-100"
              :class="[
                'h-6 w-6 text-[9px] sm:h-5 sm:w-5 sm:text-[8px]',
                pinBg(pin.status),
                isSelected(pin) ? 'ring-2 ring-offset-1 ring-brand-400 border-white scale-125 z-20' : 'border-white',
                !placingPin && !draggingPinId ? 'cursor-pointer hover:scale-125' : '',
                draggingPinId === (pin._id || pin.id) ? 'cursor-grabbing scale-150 opacity-80 z-30' : ''
              ]"
              :style="pinPos(pin)"
              :title="pin.pinName || pin.pinCode || 'Pin'"
              @click.stop="handlePinClick(pin)"
              @pointerdown.stop="startPinDrag($event, pin)"
            >
              •
            </div>

            <!-- Zones -->
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

// Refs
const viewportRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const pdfContainerRef = ref<HTMLElement | null>(null);
const pdfRendering = ref(false);

// Zoom & pan
const zoom = ref(1);
const offset = reactive({ x: 0, y: 0 });
const panning = ref(false);
const panStart = reactive({ x: 0, y: 0 });
const panOrigin = reactive({ x: 0, y: 0 });
const didPan = ref(false);

// Pin dragging
const draggingPinId = ref<string | null>(null);
const draggingPinPos = ref<{ x: number; y: number } | null>(null);
const pinDragMoved = ref(false);

// Ghost pin khi đang placement
const ghostPin = ref<{ x: number; y: number } | null>(null);

// Computed
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

/**
 * Tính toạ độ chuẩn hoá (0–1) từ pointer event,
 * dựa trên overlay (là child của contentRef, bị transform).
 * Dùng overlayRef.getBoundingClientRect() — nó đã áp dụng transform
 * nên toạ độ luôn chính xác bất kể zoom/pan.
 */
const normalizedCoords = (event: PointerEvent | MouseEvent): { x: number; y: number } | null => {
  const el = overlayRef.value;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
};

// === Zoom ===
const zoomIn = () => { zoom.value = Math.min(zoom.value + 0.15, 3); };
const zoomOut = () => { zoom.value = Math.max(zoom.value - 0.15, 0.3); };
const resetView = () => { zoom.value = 1; offset.x = 0; offset.y = 0; };
const handleWheel = (event: WheelEvent) => {
  const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  zoom.value = Math.min(Math.max(zoom.value * factor, 0.3), 3);
};

// === Pan (kéo bản vẽ) ===
const startPan = (event: PointerEvent) => {
  if (draggingPinId.value) return;
  didPan.value = false;
  panning.value = true;
  panStart.x = event.clientX;
  panStart.y = event.clientY;
  panOrigin.x = offset.x;
  panOrigin.y = offset.y;
};

// Bắt đầu pan khi kéo trên nền bản vẽ
const handleViewportPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement;
  if (props.placingPin) return;
  if (target.closest(".pin-element")) return;
  startPan(event);
};

// pointermove đặt ở viewport (bên ngoài content transform)
// để nhận event ngay cả khi pointer vượt ra ngoài pin/overlay
const handlePointerMove = (event: PointerEvent) => {
  // Đang kéo pin → cập nhật vị trí pin
  if (draggingPinId.value) {
    const coords = normalizedCoords(event);
    if (coords) {
      draggingPinPos.value = coords;
      pinDragMoved.value = true;
    }
    event.preventDefault();
    return;
  }
  // Đang pan → cập nhật offset
  if (!panning.value) return;
  const dx = event.clientX - panStart.x;
  const dy = event.clientY - panStart.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.value = true;
  offset.x = panOrigin.x + dx;
  offset.y = panOrigin.y + dy;
};

const handlePointerUp = () => {
  // Kết thúc kéo pin → emit vị trí mới (chỉ khi thật sự đã di chuyển)
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
    return;
  }
  panning.value = false;
  if (didPan.value) {
    setTimeout(() => {
      didPan.value = false;
    }, 0);
  }
};

// === Pin placement (đặt pin mới) ===
const handleOverlayClick = (event: MouseEvent) => {
  if (!props.placingPin || didPan.value) return;
  const coords = normalizedCoords(event);
  if (!coords) return;
  emit("place-pin", { pinX: coords.x, pinY: coords.y });
};

const updateGhostPin = (event: MouseEvent) => {
  if (!props.placingPin) { ghostPin.value = null; return; }
  const coords = normalizedCoords(event);
  ghostPin.value = coords;
};

// === Pin click & drag ===
const handlePinClick = (pin: Pin) => {
  // Chỉ xử lý click khi không đang placement và không vừa pan/kéo
  if (props.placingPin || didPan.value || pinDragMoved.value) return;
  emit("pin-click", pin);
};

const startPinDrag = (event: PointerEvent, pin: Pin) => {
  if (props.placingPin) return;
  const id = pin._id || pin.id;
  if (!id) return;
  // Bắt đầu kéo pin
  draggingPinId.value = id;
  pinDragMoved.value = false;
  const coords = normalizedCoords(event);
  if (coords) draggingPinPos.value = coords;
  // Không dùng setPointerCapture vì sẽ route event vào pin
  // thay vì viewport (nơi có handlePointerMove).
  // Thay vào đó ta dựa vào event bubbling + object pointer-events-none.
  event.preventDefault();
};

// === Pin position (vị trí tạm khi kéo) ===
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

const isSelected = (pin: Pin) => {
  const id = pin._id || pin.id;
  return id && id === props.selectedPinId;
};

// === Visual helpers ===
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

// === PDF.js rendering ===
let currentPdfTask: any = null;

const renderPDF = async () => {
  if (!process.client) return;
  const url = fileUrl.value;
  if (!url) return;

  pdfRendering.value = true;

  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    if (currentPdfTask) {
      try { currentPdfTask.destroy(); } catch {}
    }

    currentPdfTask = pdfjsLib.getDocument(url);
    const pdf = await currentPdfTask.promise;

    const container = pdfContainerRef.value;
    if (!container) return;

    // Xoá canvas cũ (giữ lại loading indicator nếu có)
    const canvases = container.querySelectorAll('canvas');
    canvases.forEach(c => c.remove());

    const containerWidth = container.clientWidth || 800;
    const pixelRatio = window.devicePixelRatio || 1;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const naturalViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / naturalViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.style.display = 'block';

      container.appendChild(canvas);

      const ctx = canvas.getContext('2d')!;
      ctx.scale(pixelRatio, pixelRatio);

      await page.render({ canvasContext: ctx, viewport }).promise;
    }
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      console.error('PDF render error:', err);
    }
  } finally {
    pdfRendering.value = false;
  }
};

// Watch drawing changes để render lại PDF
watch(() => props.drawing, () => {
  nextTick(() => renderPDF());
});

onMounted(() => {
  if (fileUrl.value) {
    nextTick(() => renderPDF());
  }
});
</script>

<style scoped>
.btn {
  @apply rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100;
}
</style>
