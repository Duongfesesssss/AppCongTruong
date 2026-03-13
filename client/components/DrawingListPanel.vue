<template>
  <div class="space-y-4">
    <!-- Header with filters toggle -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-900">Danh sách bản vẽ</h2>
      <button
        class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        @click="showFilters = !showFilters"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {{ showFilters ? "Ẩn" : "Hiện" }} bộ lọc
      </button>
    </div>

    <!-- Filter Panel -->
    <DrawingFilterPanel
      v-if="showFilters"
      :project-id="projectId"
      :buildings="buildings"
      :floors="floors"
      :disciplines="disciplines"
      @filter-change="handleFilterChange"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
      <svg class="mr-2 h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <span class="text-sm text-slate-500">Đang tải bản vẽ...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div
      v-else-if="drawings.length === 0"
      class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center"
    >
      <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p class="mt-2 text-sm text-slate-500">Không tìm thấy bản vẽ nào</p>
    </div>

    <!-- Drawings List -->
    <div v-else class="space-y-2">
      <div
        v-for="drawing in drawings"
        :key="drawing._id"
        class="group rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="truncate text-sm font-semibold text-slate-900">{{ drawing.name }}</h3>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="fileTypeBadgeClass(drawing.fileType)"
              >
                {{ fileTypeLabel(drawing.fileType) }}
              </span>
              <span
                v-if="drawing.isLatestVersion"
                class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
              >
                Latest
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              <span class="font-medium">Code:</span> {{ drawing.drawingCode }}
              <span v-if="drawing.versionIndex" class="ml-2">
                <span class="font-medium">Version:</span> {{ drawing.versionIndex }}
              </span>
            </p>
            <div v-if="drawing.parsedMetadata" class="mt-1 flex flex-wrap gap-1.5">
              <span
                v-if="drawing.parsedMetadata.levelCode"
                class="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
              >
                Tầng: {{ drawing.parsedMetadata.levelCode }}
              </span>
              <span
                v-if="drawing.parsedMetadata.disciplineCode"
                class="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-700"
              >
                BM: {{ drawing.parsedMetadata.disciplineCode }}
              </span>
              <span
                v-if="drawing.parsedMetadata.buildingCode"
                class="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700"
              >
                Tòa: {{ drawing.parsedMetadata.buildingCode }}
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-400">
              {{ formatFileSize(drawing.size) }} • {{ formatDate(drawing.createdAt) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-1">
            <button
              class="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              :disabled="downloadingIds.has(drawing._id)"
              @click="downloadDrawing(drawing)"
            >
              <svg
                v-if="downloadingIds.has(drawing._id)"
                class="h-3.5 w-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <svg v-else class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span class="hidden sm:inline">Tải</span>
            </button>
            <button
              class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              @click="viewDrawing(drawing)"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span class="hidden sm:inline">Xem</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DrawingFilterPanel from "./DrawingFilterPanel.vue";

type Drawing = {
  _id: string;
  name: string;
  drawingCode: string;
  versionIndex: number;
  isLatestVersion: boolean;
  fileType: "2d" | "3d" | "hybrid";
  size: number;
  createdAt: string;
  parsedMetadata?: {
    levelCode?: string;
    disciplineCode?: string;
    buildingCode?: string;
  };
};

type DrawingFilters = {
  buildingIds: Array<{ label: string; value: string }>;
  floorIds: Array<{ label: string; value: string }>;
  disciplineIds: Array<{ label: string; value: string }>;
  levelCodes: Array<{ label: string; value: string }>;
  disciplineCodes: Array<{ label: string; value: string }>;
  fileType: string;
};

const props = defineProps<{
  projectId?: string;
  buildings?: Array<{ _id: string; name: string; code: string }>;
  floors?: Array<{ _id: string; name: string; code: string; buildingId: string }>;
  disciplines?: Array<{ _id: string; name: string; code: string; floorId: string }>;
}>();

const emit = defineEmits<{
  (e: "view-drawing", drawing: Drawing): void;
}>();

const api = useApi();
const showFilters = ref(false);
const drawings = ref<Drawing[]>([]);
const loading = ref(false);
const error = ref("");
const downloadingIds = ref(new Set<string>());

const currentFilters = ref<DrawingFilters>({
  buildingIds: [],
  floorIds: [],
  disciplineIds: [],
  levelCodes: [],
  disciplineCodes: [],
  fileType: ""
});

const fetchDrawings = async () => {
  if (!props.projectId) return;

  loading.value = true;
  error.value = "";

  try {
    const params: Record<string, any> = {
      projectId: props.projectId,
      includeVersions: false
    };

    // Add filter parameters
    if (currentFilters.value.buildingIds.length > 0) {
      params.buildingIds = currentFilters.value.buildingIds.map((b) => b.value);
    }
    if (currentFilters.value.floorIds.length > 0) {
      params.floorIds = currentFilters.value.floorIds.map((f) => f.value);
    }
    if (currentFilters.value.disciplineIds.length > 0) {
      params.disciplineIds = currentFilters.value.disciplineIds.map((d) => d.value);
    }
    if (currentFilters.value.levelCodes.length > 0) {
      params.levelCodes = currentFilters.value.levelCodes.map((l) => l.value);
    }
    if (currentFilters.value.disciplineCodes.length > 0) {
      params.disciplineCodes = currentFilters.value.disciplineCodes.map((d) => d.value);
    }
    if (currentFilters.value.fileType) {
      params.fileType = currentFilters.value.fileType;
    }

    const result = await api.get("/drawings", { params });
    drawings.value = result;
  } catch (err: any) {
    error.value = err.message || "Không thể tải danh sách bản vẽ";
    console.error("Error fetching drawings:", err);
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = (filters: DrawingFilters) => {
  currentFilters.value = filters;
  fetchDrawings();
};

const downloadDrawing = async (drawing: Drawing) => {
  downloadingIds.value.add(drawing._id);

  try {
    const config = useRuntimeConfig();
    const token = useState<string | null>("auth-token", () => null);
    let url = `${config.public.apiBase}/drawings/${drawing._id}/file?download=1`;
    if (token.value) {
      url += `&token=${encodeURIComponent(token.value)}`;
    }

    // Create hidden link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = `${drawing.drawingCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err: any) {
    console.error("Error downloading drawing:", err);
    alert("Không thể tải bản vẽ");
  } finally {
    downloadingIds.value.delete(drawing._id);
  }
};

const viewDrawing = (drawing: Drawing) => {
  emit("view-drawing", drawing);
};

const fileTypeLabel = (fileType: string) => {
  const labels: Record<string, string> = {
    "2d": "2D",
    "3d": "3D",
    "hybrid": "Hybrid"
  };
  return labels[fileType] || fileType;
};

const fileTypeBadgeClass = (fileType: string) => {
  const classes: Record<string, string> = {
    "2d": "bg-blue-100 text-blue-700",
    "3d": "bg-purple-100 text-purple-700",
    "hybrid": "bg-emerald-100 text-emerald-700"
  };
  return classes[fileType] || "bg-slate-100 text-slate-700";
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// Watch projectId changes
watch(
  () => props.projectId,
  () => {
    if (props.projectId) {
      fetchDrawings();
    } else {
      drawings.value = [];
    }
  },
  { immediate: true }
);
</script>
