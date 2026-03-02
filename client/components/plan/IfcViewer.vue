<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IFCLoader } from 'web-ifc-three/IFCLoader';

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

const props = defineProps<{
  drawing: Drawing | null;
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'loaded'): void;
  (e: 'error', error: string): void;
  (e: 'view-state', state: { camera: any; target: any }): void;
}>();

const containerRef = ref<HTMLDivElement>();
const loadingProgress = ref(0);
const internalLoading = ref(false);
const internalError = ref('');

let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let ifcLoader: IFCLoader | null = null;
let animationFrameId: number | null = null;
let currentModel: THREE.Group | null = null;

const drawingTitle = computed(() => {
  return props.drawing?.name || 'No drawing selected';
});

const isLoading = computed(() => {
  return props.loading || internalLoading.value;
});

const displayError = computed(() => {
  return props.error || internalError.value;
});

const initScene = () => {
  if (!containerRef.value) return;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fafc); // slate-50

  // Camera
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(10, 10, 10);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.addEventListener('change', () => {
    if (camera && controls) {
      emit('view-state', {
        camera: camera.position.toArray(),
        target: controls.target.toArray()
      });
    }
  });

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 10, 5);
  scene.add(directionalLight);

  // Grid helper
  const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0xcccccc);
  scene.add(gridHelper);

  // Axes helper
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // IFC Loader
  ifcLoader = new IFCLoader();
  ifcLoader.ifcManager.setWasmPath('/wasm/');

  // Start animation loop
  animate();
};

const animate = () => {
  if (!scene || !camera || !renderer || !controls) return;

  animationFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

const loadIfcFile = async (drawing: Drawing) => {
  if (!scene || !ifcLoader) return;

  internalLoading.value = true;
  internalError.value = '';
  loadingProgress.value = 0;

  try {
    // Remove previous model
    if (currentModel) {
      scene.remove(currentModel);
      currentModel = null;
    }

    // Build file URL
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const fileUrl = `${baseUrl}/api/drawings/${drawing._id}/file`;

    // Load IFC model
    const model = await ifcLoader.loadAsync(
      fileUrl,
      (event) => {
        if (event.lengthComputable) {
          loadingProgress.value = Math.round((event.loaded / event.total) * 100);
        }
      }
    );

    currentModel = model as THREE.Group;
    scene.add(currentModel);

    // Center and fit camera to model
    if (camera && controls) {
      const box = new THREE.Box3().setFromObject(currentModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 1.5; // Add some padding

      camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
      controls.target.copy(center);
      controls.update();
    }

    internalLoading.value = false;
    emit('loaded');
  } catch (error) {
    console.error('Failed to load IFC:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    internalError.value = `Không thể tải file IFC: ${errorMessage}`;
    internalLoading.value = false;
    emit('error', internalError.value);
  }
};

const resetView = () => {
  if (!camera || !controls || !currentModel) return;

  const box = new THREE.Box3().setFromObject(currentModel);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.5;

  camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
  controls.target.copy(center);
  controls.update();
};

const cleanup = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (controls) {
    controls.dispose();
    controls = null;
  }

  if (currentModel && scene) {
    scene.remove(currentModel);
    currentModel = null;
  }

  if (renderer) {
    renderer.dispose();
    if (containerRef.value && renderer.domElement.parentNode === containerRef.value) {
      containerRef.value.removeChild(renderer.domElement);
    }
    renderer = null;
  }

  if (ifcLoader) {
    ifcLoader.ifcManager.dispose();
    ifcLoader = null;
  }

  scene = null;
  camera = null;
};

watch(
  () => props.drawing,
  (newDrawing) => {
    if (newDrawing && newDrawing.fileType === '3d') {
      loadIfcFile(newDrawing);
    } else if (currentModel && scene) {
      scene.remove(currentModel);
      currentModel = null;
    }
  }
);

onMounted(() => {
  initScene();
  window.addEventListener('resize', handleResize);

  if (props.drawing && props.drawing.fileType === '3d') {
    loadIfcFile(props.drawing);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  cleanup();
});
</script>

<template>
  <div class="relative h-full rounded-2xl border border-slate-200 bg-white shadow-sm">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-3">
      <div class="min-w-0 flex-1">
        <p class="text-[10px] uppercase tracking-widest text-slate-400 sm:text-xs">3D IFC View</p>
        <h2 class="truncate text-sm font-semibold text-slate-900 sm:text-base">{{ drawingTitle }}</h2>
        <p v-if="drawing?.ifcMetadata" class="text-xs text-slate-500">
          {{ drawing.ifcMetadata.ifcSchema || 'IFC' }}
          <span v-if="drawing.ifcMetadata.elementCount">
            • {{ drawing.ifcMetadata.elementCount }} elements
          </span>
        </p>
      </div>
      <div class="flex items-center gap-1 sm:gap-2">
        <button class="btn" title="Reset camera" @click="resetView">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading progress -->
    <div
      v-if="isLoading && loadingProgress > 0"
      class="border-b border-slate-200 bg-slate-50 px-4 py-2"
    >
      <div class="flex items-center gap-2">
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            :style="{ width: `${loadingProgress}%` }"
          ></div>
        </div>
        <span class="text-xs font-medium text-slate-600">{{ loadingProgress }}%</span>
      </div>
    </div>

    <!-- Viewport -->
    <div class="relative h-[55vh] overflow-hidden bg-slate-50 sm:h-[70vh]">
      <div v-if="isLoading" class="flex h-full items-center justify-center text-sm text-slate-500">
        <svg class="mr-2 h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        Đang tải model 3D...
      </div>
      <div v-else-if="displayError" class="flex h-full items-center justify-center text-sm text-rose-600">
        {{ displayError }}
      </div>
      <div v-else-if="!drawing" class="flex h-full items-center justify-center text-sm text-slate-500">
        Chọn file IFC 3D từ cây thư mục để xem.
      </div>
      <div v-else ref="containerRef" class="h-full w-full"></div>
    </div>

    <!-- Footer info -->
    <div
      v-if="drawing && !isLoading"
      class="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 sm:px-4"
    >
      <div class="flex items-center gap-4">
        <span>Pan: Chuột phải kéo</span>
        <span>Zoom: Cuộn chuột</span>
        <span>Orbit: Chuột trái kéo</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-sm;
}
</style>
