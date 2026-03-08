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

// Clipping plane state
const clippingEnabled = ref({
  x: false,
  y: false,
  z: false,
});
const clippingPosition = ref({
  x: 0, // -1 to 1, normalized position
  y: 0,
  z: 0,
});
const showClippingPanel = ref(false);

let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let ifcLoader: IFCLoader | null = null;
let animationFrameId: number | null = null;
let currentModel: THREE.Group | null = null;
let clippingPlanes: THREE.Plane[] = [];
let clippingHelpers: THREE.PlaneHelper[] = [];
let modelBounds: THREE.Box3 | null = null;

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
  renderer.localClippingEnabled = true; // Enable clipping planes
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

    // Build file URL with auth token (IFCLoader uses raw fetch, can't set headers)
    const { public: { apiBase } } = useRuntimeConfig();
    const accessToken = localStorage.getItem('accessToken');
    const tokenParam = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
    const fileUrl = `${apiBase}/drawings/${drawing._id}/file${tokenParam}`;

    // Load IFC model
    const model = await ifcLoader.loadAsync(
      fileUrl,
      (event: ProgressEvent) => {
        if (event.lengthComputable) {
          loadingProgress.value = Math.round((event.loaded / event.total) * 100);
        }
      }
    );

    currentModel = model as THREE.Group;
    scene.add(currentModel);

    // Store model bounds for clipping
    modelBounds = new THREE.Box3().setFromObject(currentModel);

    // Initialize clipping planes
    if (clippingPlanes.length === 0) {
      initClippingPlanes();
    }

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

const initClippingPlanes = () => {
  // Initialize three clipping planes for X, Y, Z axes
  clippingPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), // X plane
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), // Y plane
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), // Z plane
  ];
};

const updateClippingPlanes = () => {
  if (!currentModel || !scene || !modelBounds) return;

  // Remove old helpers
  clippingHelpers.forEach(helper => scene!.remove(helper));
  clippingHelpers = [];

  const center = modelBounds.getCenter(new THREE.Vector3());
  const size = modelBounds.getSize(new THREE.Vector3());

  // Update X plane
  if (clippingEnabled.value.x) {
    const xOffset = clippingPosition.value.x * (size.x / 2);
    clippingPlanes[0].constant = -(center.x + xOffset);

    // Add visual helper
    const helper = new THREE.PlaneHelper(clippingPlanes[0], Math.max(size.y, size.z), 0xff0000);
    scene.add(helper);
    clippingHelpers.push(helper);
  }

  // Update Y plane
  if (clippingEnabled.value.y) {
    const yOffset = clippingPosition.value.y * (size.y / 2);
    clippingPlanes[1].constant = -(center.y + yOffset);

    // Add visual helper
    const helper = new THREE.PlaneHelper(clippingPlanes[1], Math.max(size.x, size.z), 0x00ff00);
    scene.add(helper);
    clippingHelpers.push(helper);
  }

  // Update Z plane
  if (clippingEnabled.value.z) {
    const zOffset = clippingPosition.value.z * (size.z / 2);
    clippingPlanes[2].constant = -(center.z + zOffset);

    // Add visual helper
    const helper = new THREE.PlaneHelper(clippingPlanes[2], Math.max(size.x, size.y), 0x0000ff);
    scene.add(helper);
    clippingHelpers.push(helper);
  }

  // Apply clipping planes to all meshes in the model
  const activePlanes: THREE.Plane[] = [];
  if (clippingEnabled.value.x) activePlanes.push(clippingPlanes[0]);
  if (clippingEnabled.value.y) activePlanes.push(clippingPlanes[1]);
  if (clippingEnabled.value.z) activePlanes.push(clippingPlanes[2]);

  currentModel.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            mat.clippingPlanes = activePlanes;
            mat.clipShadows = true;
          });
        } else {
          mesh.material.clippingPlanes = activePlanes;
          mesh.material.clipShadows = true;
        }
      }
    }
  });
};

const toggleClipping = (axis: 'x' | 'y' | 'z') => {
  clippingEnabled.value[axis] = !clippingEnabled.value[axis];
  updateClippingPlanes();
};

const updateClippingPosition = (axis: 'x' | 'y' | 'z', value: number) => {
  clippingPosition.value[axis] = value;
  updateClippingPlanes();
};

const resetClipping = () => {
  clippingEnabled.value = { x: false, y: false, z: false };
  clippingPosition.value = { x: 0, y: 0, z: 0 };
  updateClippingPlanes();
};

const toggleClippingPanel = () => {
  showClippingPanel.value = !showClippingPanel.value;
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

  // Clean up clipping helpers
  if (scene) {
    clippingHelpers.forEach(helper => scene!.remove(helper));
  }
  clippingHelpers = [];
  clippingPlanes = [];
  modelBounds = null;

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
        <button
          v-if="currentModel"
          class="btn"
          :class="{ 'bg-blue-50 text-blue-600': showClippingPanel }"
          title="Clipping Planes"
          @click="toggleClippingPanel"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
          <span class="hidden sm:inline ml-1">Clipping</span>
        </button>
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
      <!-- Canvas luôn tồn tại trong DOM để Three.js không bị orphan khi loading state thay đổi -->
      <div ref="containerRef" class="h-full w-full"></div>

      <!-- Clipping Panel -->
      <div
        v-if="showClippingPanel && currentModel"
        class="absolute right-2 top-2 sm:right-4 sm:top-4 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden"
      >
        <!-- Panel Header -->
        <div class="bg-slate-50 border-b border-slate-200 px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-900">Mặt cắt 3D</h3>
          <div class="flex items-center gap-1">
            <button
              class="btn-small"
              title="Reset tất cả"
              @click="resetClipping"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              class="btn-small"
              title="Đóng"
              @click="toggleClippingPanel"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Panel Content -->
        <div class="p-3 sm:p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <!-- X Axis -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="clippingEnabled.x"
                  @change="toggleClipping('x')"
                  class="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-sm bg-red-500"></span>
                  Trục X (Đỏ)
                </span>
              </label>
            </div>
            <div v-if="clippingEnabled.x" class="pl-6 space-y-1">
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="clippingPosition.x"
                @input="updateClippingPosition('x', parseFloat(($event.target as HTMLInputElement).value))"
                class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-red"
              />
              <div class="flex justify-between text-xs text-slate-500">
                <span>← Trái</span>
                <span>{{ clippingPosition.x.toFixed(2) }}</span>
                <span>Phải →</span>
              </div>
            </div>
          </div>

          <!-- Y Axis -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="clippingEnabled.y"
                  @change="toggleClipping('y')"
                  class="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-sm bg-green-500"></span>
                  Trục Y (Xanh lá)
                </span>
              </label>
            </div>
            <div v-if="clippingEnabled.y" class="pl-6 space-y-1">
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="clippingPosition.y"
                @input="updateClippingPosition('y', parseFloat(($event.target as HTMLInputElement).value))"
                class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-green"
              />
              <div class="flex justify-between text-xs text-slate-500">
                <span>↓ Dưới</span>
                <span>{{ clippingPosition.y.toFixed(2) }}</span>
                <span>Trên ↑</span>
              </div>
            </div>
          </div>

          <!-- Z Axis -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="clippingEnabled.z"
                  @change="toggleClipping('z')"
                  class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-sm bg-blue-500"></span>
                  Trục Z (Xanh dương)
                </span>
              </label>
            </div>
            <div v-if="clippingEnabled.z" class="pl-6 space-y-1">
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                :value="clippingPosition.z"
                @input="updateClippingPosition('z', parseFloat(($event.target as HTMLInputElement).value))"
                class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-blue"
              />
              <div class="flex justify-between text-xs text-slate-500">
                <span>← Sau</span>
                <span>{{ clippingPosition.z.toFixed(2) }}</span>
                <span>Trước →</span>
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="pt-3 border-t border-slate-200">
            <p class="text-xs text-slate-500">
              💡 Bật/tắt các mặt cắt để xem bên trong mô hình 3D.
              Kéo thanh trượt để điều chỉnh vị trí mặt cắt.
            </p>
          </div>
        </div>
      </div>

      <!-- Overlays (absolute, đè lên canvas) -->
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        <svg class="mr-2 h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        Đang tải model 3D...
      </div>
      <div v-else-if="displayError" class="absolute inset-0 flex items-center justify-center bg-slate-50 text-sm text-rose-600">
        {{ displayError }}
      </div>
      <div v-else-if="!drawing" class="absolute inset-0 flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Chọn file IFC 3D từ cây thư mục để xem.
      </div>
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

.btn-small {
  @apply inline-flex items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 transition-colors;
}

/* Custom slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: currentColor;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: currentColor;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-red {
  @apply text-red-500;
}

.slider-green {
  @apply text-green-500;
}

.slider-blue {
  @apply text-blue-500;
}
</style>
