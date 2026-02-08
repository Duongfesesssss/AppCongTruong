<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 text-center">
      <svg class="mx-auto h-8 w-8 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <p class="mt-2 text-sm text-slate-500">Đang tải...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl sm:rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-6 text-center">
      <p class="text-sm text-rose-600">{{ error }}</p>
    </div>

    <!-- Task Detail -->
    <template v-else-if="task">
      <!-- Task Info Card -->
      <section class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">Task</p>
            <h2 class="mt-1 truncate text-lg sm:text-xl font-bold text-slate-900">{{ task.pinName || task.pinCode }}</h2>
            <p class="mt-0.5 truncate text-xs sm:text-sm text-slate-500">{{ task.pinCode }}</p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold uppercase"
            :class="statusBadge(task.status)"
          >
            {{ statusLabel(task.status) }}
          </span>
        </div>

        <div class="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-2">
          <div>
            <p class="text-xs font-medium uppercase text-slate-400">Phòng</p>
            <p class="mt-1 text-sm text-slate-700">{{ task.roomName || '-' }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase text-slate-400">Bộ phận thi công</p>
            <p class="mt-1 text-sm text-slate-700">{{ task.gewerk || '-' }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase text-slate-400">Loại</p>
            <p class="mt-1 text-sm text-slate-700">{{ categoryLabel(task.category) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase text-slate-400">Vị trí</p>
            <p class="mt-1 text-sm text-slate-700">X: {{ task.pinX?.toFixed(2) }}, Y: {{ task.pinY?.toFixed(2) }}</p>
          </div>
        </div>

        <div v-if="task.description" class="mt-4 sm:mt-6">
          <p class="text-[10px] sm:text-xs font-medium uppercase text-slate-400">Mô tả</p>
          <p class="mt-1 text-xs sm:text-sm text-slate-700">{{ task.description }}</p>
        </div>
      </section>

      <!-- Photos Section -->
      <section class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm sm:text-base font-semibold text-slate-900">Ảnh ({{ photos.length }})</h3>
          <div class="flex items-center gap-2">
            <!-- Export Excel button -->
            <button
              v-if="photos.length > 0"
              class="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200"
              @click="exportExcel"
            >
              <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
            <!-- Upload photo button -->
            <button
              class="flex shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-brand-600 hover:bg-brand-100 active:bg-brand-200"
              @click="showPhotoUploadModal = true"
            >
              <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Tải ảnh
            </button>
          </div>
        </div>

        <div v-if="uploadingPhoto" class="mt-4 text-center text-sm text-slate-500">
          <svg class="mx-auto h-6 w-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Đang tải lên...
        </div>

        <div v-else-if="photos.length === 0" class="mt-3 sm:mt-4 rounded-lg border border-dashed border-slate-200 p-4 sm:p-6 text-center">
          <svg class="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="mt-2 text-sm text-slate-400">Chưa có ảnh. Tải ảnh hiện trường để bắt đầu đo.</p>
        </div>

        <div v-else class="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div
            v-for="photo in photos"
            :key="photo._id"
            class="group relative aspect-square overflow-hidden rounded-lg border border-slate-200"
          >
            <img
              :src="getPhotoUrl(photo)"
              :alt="photo.storageKey"
              class="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
              @click="openAnnotator(photo)"
            />
            <!-- Delete button (top-left) -->
            <button
              class="absolute left-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 active:bg-rose-700"
              title="Xoá ảnh"
              @click.stop="handleDeletePhoto(photo)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <!-- Badge nếu đã có annotations (top-right) -->
            <div
              v-if="photo.annotations?.length"
              class="absolute right-1 top-1 z-10 flex items-center gap-0.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {{ photo.annotations.length }}
            </div>
            <div class="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30" @click="openAnnotator(photo)">
              <svg class="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Photo Annotator Modal -->
    <PhotoAnnotator
      :show="!!annotatingPhoto && !!annotatingPhoto._id"
      :photo-url="annotatingPhotoUrl"
      :photo-id="annotatingPhoto?._id || ''"
      :initial-annotations="annotatingPhoto?.annotations || []"
      @close="closeAnnotator"
      @saved="handleAnnotationSaved"
    />

    <!-- Photo Upload Modal -->
    <PhotoUploadModal
      :show="showPhotoUploadModal"
      @upload="handlePhotoUploadWithMetadata"
      @cancel="showPhotoUploadModal = false"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteConfirm"
      title="Xoá ảnh?"
      message="Bạn có chắc muốn xoá ảnh này không?"
      confirm-text="Xoá"
      :danger="true"
      @confirm="confirmDeletePhoto"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";

const props = defineProps<{
  taskId: string;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
}>();

const api = useApi();
const toast = useToast();
const config = useRuntimeConfig();
const token = useState<string | null>("auth-token", () => null);

const task = ref<any>(null);
const photos = ref<any[]>([]);
const loading = ref(false);
const error = ref("");
const uploadingPhoto = ref(false);

// Photo upload modal state
const showPhotoUploadModal = ref(false);

// Photo annotator state
const annotatingPhoto = ref<any>(null);
const annotatingPhotoUrl = computed(() => {
  if (!annotatingPhoto.value) return "";
  return getPhotoUrl(annotatingPhoto.value);
});

// Delete photo state
const showDeleteConfirm = ref(false);
const deletingPhoto = ref<any>(null);

const loadTask = async () => {
  loading.value = true;
  error.value = "";
  try {
    const [taskData, photosData] = await Promise.all([
      api.get<any>(`/api/tasks/${props.taskId}`),
      api.get<any[]>(`/api/tasks/${props.taskId}/photos`)
    ]);
    task.value = taskData;
    photos.value = photosData || [];
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
};

const handlePhotoUploadWithMetadata = async (data: {
  files: File[];
  name: string;
  description: string;
  location: string;
  category: string;
}) => {
  uploadingPhoto.value = true;
  showPhotoUploadModal.value = false;

  try {
    // Upload each file with metadata
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      const formData = new FormData();

      formData.append("taskId", props.taskId);
      formData.append("file", file);

      // Generate name for multiple files: "Ảnh van 1", "Ảnh van 2", etc.
      const photoName = data.files.length > 1
        ? `${data.name} ${i + 1}`
        : data.name;

      formData.append("name", photoName);
      if (data.description) formData.append("description", data.description);
      if (data.location) formData.append("location", data.location);
      if (data.category) formData.append("category", data.category);

      await api.upload("/photos", formData);
    }

    toast.push(
      data.files.length > 1
        ? `Đã tải ${data.files.length} ảnh thành công`
        : "Tải ảnh thành công",
      "success"
    );

    await loadTask();
    emit("updated");
  } catch (err) {
    toast.push((err as Error).message, "error");
  } finally {
    uploadingPhoto.value = false;
  }
};

// Legacy handler - can be removed if not used elsewhere
const handlePhotoUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;

  uploadingPhoto.value = true;
  try {
    // Hỗ trợ upload nhiều ảnh cùng lúc
    for (const file of Array.from(input.files)) {
      const formData = new FormData();
      formData.append("taskId", props.taskId);
      formData.append("file", file);
      await api.upload("/photos", formData);
    }
    toast.push(
      input.files.length > 1
        ? `Đã tải ${input.files.length} ảnh thành công`
        : "Tải ảnh thành công",
      "success"
    );
    await loadTask();
    emit("updated");
  } catch (err) {
    toast.push((err as Error).message, "error");
  } finally {
    uploadingPhoto.value = false;
    input.value = "";
  }
};

const getPhotoUrl = (photo: any) => {
  const base = `${config.public.apiBase}/api/photos/${photo._id}/file`;
  return token.value ? `${base}?token=${encodeURIComponent(token.value)}` : base;
};

const exportExcel = async () => {
  try {
    // Lấy task data để có projectId
    if (!task.value) {
      toast.push("Không tìm thấy task", "error");
      return;
    }

    const url = new URL(`${config.public.apiBase}/api/reports/export-excel`);

    // Export theo task hiện tại (tất cả photos của task)
    // Có thể mở rộng thành filter theo project/date range sau
    if (task.value.projectId) {
      url.searchParams.append("projectId", task.value.projectId);
    }

    // Add token for auth
    if (token.value) {
      url.searchParams.append("token", token.value);
    }

    // Create download link
    const a = document.createElement("a");
    a.href = url.toString();
    a.download = `bao-cao-${task.value.pinCode || "do-dac"}-${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.push("Đang tải xuống báo cáo Excel...", "success");
  } catch (err) {
    console.error("Export Excel error:", err);
    toast.push((err as Error).message || "Lỗi khi xuất Excel", "error");
  }
};

const openAnnotator = (photo: any) => {
  console.log("openAnnotator called", {
    photoId: photo._id,
    annotations: photo.annotations
  });
  annotatingPhoto.value = photo;
};

const closeAnnotator = () => {
  console.log("closeAnnotator called");
  annotatingPhoto.value = null;
};

const handleAnnotationSaved = async () => {
  console.log("handleAnnotationSaved called");
  // Tải lại danh sách ảnh để cập nhật annotations
  await loadTask();
  annotatingPhoto.value = null;
};

const handleDeletePhoto = (photo: any) => {
  console.log("handleDeletePhoto called with:", photo._id);
  deletingPhoto.value = photo;
  showDeleteConfirm.value = true;
};

const confirmDeletePhoto = async () => {
  if (!deletingPhoto.value) return;

  console.log("Deleting photo:", deletingPhoto.value._id);

  try {
    await api.delete(`/api/photos/${deletingPhoto.value._id}`);
    toast.push("Đã xoá ảnh", "success");
    await loadTask();
    emit("updated");
  } catch (err) {
    console.error("Delete photo error:", err);
    toast.push((err as Error).message || "Lỗi khi xoá ảnh", "error");
  } finally {
    showDeleteConfirm.value = false;
    deletingPhoto.value = null;
  }
};

// Status helpers
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

const categoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    quality: "Chất lượng",
    safety: "An toàn",
    progress: "Tiến độ",
    fire_protection: "Chống cháy",
    other: "Khác"
  };
  return labels[category] || category;
};

// Load on mount and when taskId changes
watch(() => props.taskId, loadTask, { immediate: true });
</script>
