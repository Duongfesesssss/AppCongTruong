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

        <div class="mt-4 sm:mt-6 border-t border-slate-100 pt-4 sm:pt-5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[10px] sm:text-xs font-medium uppercase text-slate-400">Chỉnh sửa Pin/Task</p>
            <p v-if="editDisabledReason" class="text-[10px] sm:text-xs text-amber-600">{{ editDisabledReason }}</p>
          </div>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên Pin</label>
              <input
                v-model="editForm.pinName"
                type="text"
                class="input"
                placeholder="VD: Điểm đo 1"
                :disabled="savingTask || !canUpdateTask"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</label>
              <select v-model="editForm.status" class="input" :disabled="savingTask || !canUpdateTask">
                <option value="instruction">Hướng dẫn cho người vẽ</option>
                <option value="rfi">Yêu cầu thêm thông tin (RFI)</option>
                <option value="resolved">Đã hoàn thành</option>
                <option value="approved">Đã được QA kiểm soát</option>
                <option value="open">Mở</option>
                <option value="in_progress">Đang làm</option>
                <option value="blocked">Bị chặn</option>
                <option value="done">Xong</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Loại</label>
              <select v-model="editForm.category" class="input" :disabled="savingTask || !canUpdateTask">
                <option value="quality">Chất lượng</option>
                <option value="safety">An toàn</option>
                <option value="progress">Tiến độ</option>
                <option value="fire_protection">Chống cháy</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Mô tả (hỗ trợ @username)
              </label>
              <textarea
                v-model="editForm.description"
                class="input"
                rows="3"
                placeholder="Nhập mô tả, có thể tag người bằng @username"
                :disabled="savingTask || !canUpdateTask"
              ></textarea>
              <div v-if="mentionCandidates.length > 0" class="mt-2 flex flex-wrap gap-1">
                <button
                  v-for="candidate in mentionCandidates"
                  :key="candidate.id"
                  type="button"
                  class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                  :disabled="savingTask || !canUpdateTask"
                  @click="insertMentionToken(candidate.mentionToken)"
                >
                  {{ candidate.name }} (@{{ candidate.mentionToken }})
                </button>
              </div>
            </div>
          </div>

          <p v-if="editError" class="mt-2 text-xs text-rose-600">{{ editError }}</p>

          <div class="mt-3 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              :disabled="savingTask || !canUpdateTask"
              @click="resetEditForm"
            >
              Reset
            </button>
            <button
              type="button"
              class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              :disabled="savingTask || !canUpdateTask || !isEditDirty"
              @click="saveTaskEdits"
            >
              {{ savingTask ? "Đang lưu..." : "Lưu chỉnh sửa" }}
            </button>
          </div>
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
              class="h-full w-full object-cover transition-transform"
              :class="photo._offlineQueued ? 'cursor-pointer opacity-90 md:group-hover:scale-105' : 'cursor-pointer md:group-hover:scale-105'"
              @click="openAnnotator(photo)"
            />
            <!-- Delete button (top-left) -->
            <button
              v-if="!photo._offlineQueued && canDeletePhoto"
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
            <div
              v-if="photo._offlineQueued"
              class="absolute right-1 top-1 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white"
            >
              Chờ đồng bộ
            </div>
            <div
              class="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors"
              :class="'cursor-pointer md:group-hover:bg-black/30'"
              @click="openAnnotator(photo)"
            >
              <svg class="h-8 w-8 text-white opacity-0 transition-opacity md:group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Photo Annotator Modal -->
    <component
      :is="PhotoAnnotatorAsync"
      v-if="!!annotatingPhoto && !!annotatingPhoto._id"
      :show="true"
      :photo-url="annotatingPhotoUrl"
      :photo-id="annotatingPhoto?._id || ''"
      :photo-width="annotatingPhoto?.width"
      :photo-height="annotatingPhoto?.height"
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
import { isOfflineQueuedResponse, useApi } from "~/composables/api/useApi";
import { useOfflineSync } from "~/composables/state/useOfflineSync";
import { useToast } from "~/composables/state/useToast";

const props = defineProps<{
  taskId: string;
  taskData?: Record<string, unknown> | null;
  canDeletePhoto?: boolean;
  canEditTask?: boolean;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
}>();

const api = useApi();
const offlineSync = useOfflineSync();
const toast = useToast();
const config = useRuntimeConfig();
const token = useState<string | null>("auth-token", () => null);

const task = ref<any>(null);
const photos = ref<any[]>([]);
const loading = ref(false);
const error = ref("");
const uploadingPhoto = ref(false);
const PhotoAnnotatorAsync = defineAsyncComponent(() => import("~/components/PhotoAnnotator.vue"));

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
const savingTask = ref(false);
const editError = ref("");

type MentionCandidate = {
  id: string;
  name: string;
  mentionToken: string;
};
const mentionCandidates = ref<MentionCandidate[]>([]);

const editForm = reactive({
  pinName: "",
  status: "instruction",
  category: "quality",
  description: ""
});

const normalizeText = (value: unknown) => String(value || "").trim();
const resolveObjectId = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const maybeObject = value as { _id?: unknown; id?: unknown };
    if (typeof maybeObject._id === "string") return maybeObject._id.trim();
    if (typeof maybeObject.id === "string") return maybeObject.id.trim();
  }
  return "";
};
const isOfflineTask = computed(() => String(task.value?._id || props.taskId || "").startsWith("offline-"));
const canEditByRole = computed(() => props.canEditTask !== false);
const canUpdateTask = computed(() => !!task.value && !isOfflineTask.value && canEditByRole.value);
const editDisabledReason = computed(() => {
  if (!task.value) return "";
  if (isOfflineTask.value) return "Task offline: chờ đồng bộ để chỉnh sửa";
  if (!canEditByRole.value) return "Bạn không có quyền chỉnh sửa task/pin";
  return "";
});

const syncEditFormFromTask = () => {
  editForm.pinName = normalizeText(task.value?.pinName);
  editForm.status = normalizeText(task.value?.status) || "instruction";
  editForm.category = normalizeText(task.value?.category) || "quality";
  editForm.description = normalizeText(task.value?.description);
  editError.value = "";
};

const isEditDirty = computed(() => {
  if (!task.value) return false;
  return (
    normalizeText(editForm.pinName) !== normalizeText(task.value.pinName) ||
    normalizeText(editForm.status) !== normalizeText(task.value.status) ||
    normalizeText(editForm.category) !== normalizeText(task.value.category) ||
    normalizeText(editForm.description) !== normalizeText(task.value.description)
  );
});

const mentionTokenRegex = /@([a-zA-Z0-9._-]{2,64})/;
const hasMentionToken = (value: string) => mentionTokenRegex.test(value || "");

const fetchMentionCandidates = async () => {
  const projectId = resolveObjectId(task.value?.projectId) || resolveObjectId(props.taskData?.projectId);
  if (!projectId) {
    mentionCandidates.value = [];
    return;
  }

  try {
    const candidates = await api.get<Array<{ id?: string; name?: string; mentionToken?: string }>>(
      `/chats/mention-candidates?scope=project&projectId=${projectId}`
    );
    const normalized = (candidates || [])
      .map((item) => {
        const mentionToken = String(item.mentionToken || "").trim();
        const id = String(item.id || "").trim();
        const name = String(item.name || mentionToken).trim();
        if (!mentionToken || !id) return null;
        return {
          id,
          name,
          mentionToken
        } as MentionCandidate;
      })
      .filter((item): item is MentionCandidate => !!item);
    const deduped = Array.from(new Map(normalized.map((item) => [item.mentionToken, item])).values());
    mentionCandidates.value = deduped.slice(0, 24);
  } catch {
    mentionCandidates.value = [];
  }
};

const insertMentionToken = (token: string) => {
  if (!token) return;
  const mention = `@${token}`;
  const current = editForm.description.trim();
  if (!current) {
    editForm.description = `${mention} `;
    return;
  }
  if (current.includes(mention)) return;
  editForm.description = `${current} ${mention} `;
};

const resetEditForm = () => {
  syncEditFormFromTask();
};

const saveTaskEdits = async () => {
  if (!task.value?._id || !canUpdateTask.value || savingTask.value) return;

  savingTask.value = true;
  editError.value = "";
  try {
    const nextDescription = normalizeText(editForm.description);
    const previousDescription = normalizeText(task.value.description);
    const payload: Record<string, unknown> = {
      id: task.value._id,
      pinName: normalizeText(editForm.pinName) || undefined,
      status: normalizeText(editForm.status) || undefined,
      category: normalizeText(editForm.category) || undefined,
      description: nextDescription || undefined
    };

    if (nextDescription !== previousDescription && hasMentionToken(nextDescription)) {
      payload.mentionText = nextDescription.slice(0, 500);
    }

    const result = await api.post<any>("/tasks", payload);
    if (isOfflineQueuedResponse(result)) {
      task.value = {
        ...task.value,
        ...payload
      };
      toast.push("Đã lưu tạm chỉnh sửa task/pin, sẽ đồng bộ khi có mạng.", "info");
    } else {
      task.value = result;
      toast.push("Đã cập nhật task/pin", "success");
    }
    syncEditFormFromTask();
    emit("updated");
  } catch (err) {
    editError.value = (err as Error).message || "Không thể cập nhật task/pin";
  } finally {
    savingTask.value = false;
  }
};

const revokeLocalPreviewUrls = (items: any[]) => {
  if (!process.client) return;
  for (const item of items) {
    if (item?._offlinePreviewUrl) {
      URL.revokeObjectURL(item._offlinePreviewUrl);
    }
  }
};

const addQueuedPhotoPreview = (file: File, queueId: string) => {
  if (!process.client) return;
  const previewUrl = URL.createObjectURL(file);
  photos.value.unshift({
    _id: `offline-${queueId}`,
    storageKey: file.name,
    annotations: [],
    _offlineQueued: true,
    _offlinePreviewUrl: previewUrl
  });
};

const applyTaskFallback = () => {
  if (!props.taskData) return false;
  task.value = { ...props.taskData };
  revokeLocalPreviewUrls(photos.value);
  photos.value = [];
  syncEditFormFromTask();
  void fetchMentionCandidates();
  error.value = "";
  return true;
};

const loadTask = async () => {
  if (props.taskId.startsWith("offline-")) {
    loading.value = false;
    if (!applyTaskFallback()) {
      error.value = "Task offline chưa sẵn sàng. Vui lòng đợi đồng bộ.";
    }
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const [taskData, photosData] = await Promise.all([
      api.get<any>(`/tasks/${props.taskId}`),
      api.get<any[]>(`/tasks/${props.taskId}/photos`)
    ]);
    task.value = taskData;
    revokeLocalPreviewUrls(photos.value);
    photos.value = photosData || [];
    syncEditFormFromTask();
    void fetchMentionCandidates();
  } catch (err) {
    const message = (err as Error).message || "";
    const likelyOffline =
      (process.client && !navigator.onLine) ||
      /offline|network|failed to fetch|không thể tải/i.test(message);
    if (likelyOffline && applyTaskFallback()) {
      error.value = "";
    } else {
      error.value = message;
    }
  } finally {
    loading.value = false;
  }
};

const handlePhotoUploadWithMetadata = async (data: {
  files: File[];
}) => {
  uploadingPhoto.value = true;
  showPhotoUploadModal.value = false;

  try {
    const formData = new FormData();
    formData.append("taskId", props.taskId);
    for (const file of data.files) {
      formData.append("files", file);
    }

    const result = await api.upload<{
      jobId: string;
      status: string;
      totalFiles: number;
    }>("/photos/bulk", formData);

    if (isOfflineQueuedResponse(result)) {
      data.files.forEach((file, index) => {
        addQueuedPhotoPreview(file, `${result.queueId}-${index + 1}`);
      });
      toast.push(`Đã lưu tạm ${data.files.length} ảnh, sẽ tự đồng bộ khi có mạng`, "info");
      emit("updated");
      return;
    }

    toast.push(`Đang xử lý ${result.totalFiles} ảnh ở chế độ nền...`, "info");
    void monitorBulkUploadJob(result.jobId);
  } catch (err) {
    toast.push((err as Error).message, "error");
  } finally {
    uploadingPhoto.value = false;
  }
};

const monitorBulkUploadJob = async (jobId: string) => {
  try {
    const maxAttempts = 120;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const job = await api.get<{
        status: "processing" | "completed" | "completed_with_errors" | "failed";
        totalFiles: number;
        successCount: number;
        failedCount: number;
        errors: Array<{ fileName: string; message: string }>;
      }>(`/photos/bulk/${jobId}`);

      if (job.status === "processing") {
        continue;
      }

      if (job.status === "completed") {
        toast.push(`Đã tải ${job.successCount}/${job.totalFiles} ảnh`, "success");
      } else if (job.status === "completed_with_errors") {
        toast.push(
          `Tải xong ${job.successCount}/${job.totalFiles} ảnh, lỗi ${job.failedCount} ảnh`,
          "info"
        );
      } else {
        const firstError = job.errors?.[0]?.message || "Upload thất bại";
        toast.push(firstError, "error");
      }

      if (process.client && navigator.onLine) {
        await loadTask();
      }
      emit("updated");
      return;
    }

    toast.push("Upload đang xử lý, vui lòng thử tải lại sau.", "info");
  } catch (err) {
    toast.push((err as Error).message || "Không theo dõi được tiến trình upload", "error");
  }
};

const getPhotoUrl = (photo: any) => {
  if (photo?._offlinePreviewUrl) {
    return photo._offlinePreviewUrl;
  }
  const base = `${config.public.apiBase}/photos/${photo._id}/file`;
  return token.value ? `${base}?token=${encodeURIComponent(token.value)}` : base;
};

const exportExcel = async () => {
  try {
    // Lấy task data để có projectId
    if (!task.value) {
      toast.push("Không tìm thấy task", "error");
      return;
    }

    // Build absolute URL
    const baseUrl = config.public.apiBase.startsWith('http')
      ? config.public.apiBase
      : `${window.location.origin}${config.public.apiBase}`;
    const url = new URL(`${baseUrl}/reports/export-excel`);

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
  // Reload after a short delay to pick up any annotations saved by persistAnnotationsOnClose
  if (process.client && navigator.onLine) {
    setTimeout(() => { void loadTask(); }, 1500);
  }
};

const handleAnnotationSaved = async () => {
  console.log("handleAnnotationSaved called");
  if (process.client && navigator.onLine) {
    await loadTask();
  }
  annotatingPhoto.value = null;
};

const handleDeletePhoto = (photo: any) => {
  if (props.canDeletePhoto === false) {
    toast.push("Tài khoản kỹ thuật viên không có quyền xóa ảnh", "info");
    return;
  }
  if (photo?._offlineQueued) {
    toast.push("Ảnh đang chờ đồng bộ, chưa thể xóa.", "info");
    return;
  }
  console.log("handleDeletePhoto called with:", photo._id);
  deletingPhoto.value = photo;
  showDeleteConfirm.value = true;
};

const confirmDeletePhoto = async () => {
  if (!deletingPhoto.value) return;

  console.log("Deleting photo:", deletingPhoto.value._id);

  try {
    const result = await api.delete(`/photos/${deletingPhoto.value._id}`);
    const queued = isOfflineQueuedResponse(result);
    photos.value = photos.value.filter((photo) => photo._id !== deletingPhoto.value._id);
    if (queued) {
      toast.push("Lệnh xóa đã lưu tạm, sẽ đồng bộ khi có mạng", "info");
    } else {
      toast.push("Đã xoá ảnh", "success");
    }
    if (process.client && navigator.onLine && !queued) {
      await loadTask();
    }
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
    instruction: "bg-slate-100 text-slate-700",
    rfi: "bg-amber-100 text-amber-700",
    resolved: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    open: "bg-slate-100 text-slate-700",
    in_progress: "bg-amber-100 text-amber-700",
    blocked: "bg-amber-100 text-amber-700",
    done: "bg-blue-100 text-blue-700"
  };
  return badges[status] || "bg-slate-100 text-slate-600";
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    instruction: "Hướng dẫn",
    rfi: "RFI",
    resolved: "Đã hoàn thành",
    approved: "Đã QA duyệt",
    open: "Hướng dẫn",
    in_progress: "RFI",
    blocked: "RFI",
    done: "Đã hoàn thành"
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

onUnmounted(() => {
  revokeLocalPreviewUrls(photos.value);
});

// Load on mount and when taskId changes
watch(() => props.taskId, loadTask, { immediate: true });

watch(
  () => offlineSync.lastSuccessfulSyncAt.value,
  async (value, previousValue) => {
    if (!value || value === previousValue) return;
    if (props.taskId.startsWith("offline-")) return;
    if (process.client && !navigator.onLine) return;
    await loadTask();
  }
);
</script>
