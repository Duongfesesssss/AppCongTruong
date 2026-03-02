<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import PlanViewer from './PlanViewer.vue';
import IfcViewer from './IfcViewer.vue';

type Drawing = {
  _id: string;
  name: string;
  storageKey: string;
  mimeType: string;
  fileType?: '2d' | '3d' | 'hybrid';
  linkedDrawingId?: string;
  ifcMetadata?: {
    ifcSchema?: string;
    containsBuildingElements?: boolean;
    elementCount?: number;
  };
};

type Pin = {
  _id: string;
  pinX: number;
  pinY: number;
  pinName?: string;
  status?: string;
  category?: string;
};

type Zone = {
  _id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  status?: string;
};

const props = defineProps<{
  drawing2d: Drawing | null;
  drawing3d: Drawing | null;
  pins?: Pin[];
  zones?: Zone[];
  loading?: boolean;
  error?: string;
  placingPin?: boolean;
  selectedPinId?: string;
}>();

const emit = defineEmits<{
  (e: 'pin-click', pinId: string): void;
  (e: 'zone-click', zoneId: string): void;
  (e: 'place-pin', data: { pinX: number; pinY: number }): void;
  (e: 'pin-move', data: { pinId: string; pinX: number; pinY: number }): void;
  (e: 'cancel-place'): void;
  (e: 'view-state', data: { viewer: '2d' | '3d'; state: any }): void;
}>();

type ViewMode = '2d' | '3d' | 'split';

const viewMode = ref<ViewMode>('split');
const splitOrientation = ref<'horizontal' | 'vertical'>('horizontal');

const hasLinkedFiles = computed(() => {
  return !!(props.drawing2d && props.drawing3d);
});

const canShowSplit = computed(() => {
  return hasLinkedFiles.value;
});

const show2D = computed(() => {
  return viewMode.value === '2d' || (viewMode.value === 'split' && canShowSplit.value);
});

const show3D = computed(() => {
  return viewMode.value === '3d' || (viewMode.value === 'split' && canShowSplit.value);
});

const containerClass = computed(() => {
  if (viewMode.value === 'split' && canShowSplit.value) {
    return splitOrientation.value === 'horizontal'
      ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
      : 'grid grid-rows-2 gap-4';
  }
  return '';
});

const setViewMode = (mode: ViewMode) => {
  if (mode === 'split' && !canShowSplit.value) {
    // If split mode but no linked files, show whichever is available
    if (props.drawing2d) {
      viewMode.value = '2d';
    } else if (props.drawing3d) {
      viewMode.value = '3d';
    }
    return;
  }
  viewMode.value = mode;
};

const toggleSplitOrientation = () => {
  splitOrientation.value = splitOrientation.value === 'horizontal' ? 'vertical' : 'horizontal';
};

// Auto-switch view mode based on available drawings
watch(
  () => [props.drawing2d, props.drawing3d],
  () => {
    if (!props.drawing2d && !props.drawing3d) {
      return;
    }

    // If in split mode but only one drawing available, switch to appropriate view
    if (viewMode.value === 'split' && !canShowSplit.value) {
      if (props.drawing2d) {
        viewMode.value = '2d';
      } else if (props.drawing3d) {
        viewMode.value = '3d';
      }
    }

    // If both drawings available and fileType is hybrid, default to split
    if (
      props.drawing2d?.fileType === 'hybrid' &&
      props.drawing3d?.fileType === 'hybrid' &&
      viewMode.value !== 'split'
    ) {
      viewMode.value = 'split';
    }
  },
  { immediate: true }
);

const handle2DViewState = (state: any) => {
  emit('view-state', { viewer: '2d', state });
};

const handle3DViewState = (state: any) => {
  emit('view-state', { viewer: '3d', state });
};
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <!-- View Mode Controls -->
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-slate-700">Chế độ xem:</span>
        <div class="flex items-center gap-1 rounded-md bg-slate-100 p-1">
          <button
            :class="[
              'btn-tab',
              viewMode === '2d' && 'active',
              !drawing2d && 'opacity-50 cursor-not-allowed'
            ]"
            :disabled="!drawing2d"
            @click="setViewMode('2d')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="hidden sm:inline">2D PDF</span>
          </button>

          <button
            :class="[
              'btn-tab',
              viewMode === '3d' && 'active',
              !drawing3d && 'opacity-50 cursor-not-allowed'
            ]"
            :disabled="!drawing3d"
            @click="setViewMode('3d')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span class="hidden sm:inline">3D IFC</span>
          </button>

          <button
            :class="[
              'btn-tab',
              viewMode === 'split' && 'active',
              !canShowSplit && 'opacity-50 cursor-not-allowed'
            ]"
            :disabled="!canShowSplit"
            @click="setViewMode('split')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 4H5a2 2 0 00-2 2v6a2 2 0 002 2h4m10-8h-4a2 2 0 00-2 2v6a2 2 0 002 2h4m0 0a2 2 0 002-2V6a2 2 0 00-2-2m0 14a2 2 0 002-2v-6a2 2 0 00-2-2" />
            </svg>
            <span class="hidden sm:inline">Song song</span>
          </button>
        </div>
      </div>

      <div v-if="viewMode === 'split' && canShowSplit" class="flex items-center gap-2">
        <button
          class="btn-control"
          title="Đổi hướng split"
          @click="toggleSplitOrientation"
        >
          <svg v-if="splitOrientation === 'horizontal'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12M8 12h12m-12 5h12M4 7h.01M4 12h.01M4 17h.01" />
          </svg>
          <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span class="hidden sm:inline">
            {{ splitOrientation === 'horizontal' ? 'Ngang' : 'Dọc' }}
          </span>
        </button>
      </div>

      <div v-if="!canShowSplit && (drawing2d || drawing3d)" class="text-xs text-amber-600">
        <svg class="inline h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Link file PDF và IFC để xem song song
      </div>
    </div>

    <!-- Viewers Container -->
    <div :class="containerClass" class="flex-1 min-h-0">
      <!-- 2D PDF Viewer -->
      <div v-if="show2D" class="h-full min-h-0">
        <PlanViewer
          :drawing="drawing2d"
          :pins="pins"
          :zones="zones"
          :loading="loading"
          :error="error"
          :placing-pin="placingPin"
          :selected-pin-id="selectedPinId"
          @pin-click="emit('pin-click', $event)"
          @zone-click="emit('zone-click', $event)"
          @place-pin="emit('place-pin', $event)"
          @pin-move="emit('pin-move', $event)"
          @cancel-place="emit('cancel-place')"
          @view-state="handle2DViewState"
        />
      </div>

      <!-- 3D IFC Viewer -->
      <div v-if="show3D" class="h-full min-h-0">
        <IfcViewer
          :drawing="drawing3d"
          :loading="loading"
          :error="error"
          @view-state="handle3DViewState"
        />
      </div>

      <!-- No Drawing Selected -->
      <div
        v-if="!show2D && !show3D"
        class="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"
      >
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-2">Chọn bản vẽ từ cây thư mục để xem</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-tab {
  @apply inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors;
}

.btn-tab.active {
  @apply bg-white text-blue-600 shadow-sm;
}

.btn-tab:not(.active):hover:not(:disabled) {
  @apply text-slate-800;
}

.btn-control {
  @apply inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50;
}
</style>
