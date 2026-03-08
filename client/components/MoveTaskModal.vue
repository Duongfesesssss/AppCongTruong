<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div class="border-b border-slate-100 px-6 py-4">
        <h3 class="text-lg font-semibold text-slate-900">Di chuyển Pin/Task</h3>
        <p class="mt-1 text-sm text-slate-500">Chọn bản vẽ đích để di chuyển pin</p>
      </div>

      <div class="px-6 py-4">
        <div v-if="loading" class="text-center py-8">
          <svg class="mx-auto h-8 w-8 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p class="mt-2 text-sm text-slate-500">Đang tải danh sách bản vẽ...</p>
        </div>

        <div v-else-if="error" class="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p class="text-sm text-rose-600">{{ error }}</p>
        </div>

        <div v-else>
          <label class="mb-2 block text-sm font-medium text-slate-700">Chọn bản vẽ đích</label>
          <select
            v-model="selectedDrawingId"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            :disabled="moving"
          >
            <option value="">-- Chọn bản vẽ --</option>
            <option
              v-for="drawing in drawings"
              :key="drawing._id"
              :value="drawing._id"
              :disabled="drawing._id === currentDrawingId"
            >
              {{ drawing.name }}{{ drawing._id === currentDrawingId ? ' (hiện tại)' : '' }}
            </option>
          </select>

          <p class="mt-3 text-xs text-slate-500">
            Pin sẽ giữ nguyên vị trí (tọa độ) khi di chuyển sang bản vẽ khác.
          </p>
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          :disabled="moving"
          @click="emit('cancel')"
        >
          Hủy
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="moving || !selectedDrawingId || selectedDrawingId === currentDrawingId"
          @click="handleMove"
        >
          {{ moving ? "Đang di chuyển..." : "Di chuyển" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";

const props = defineProps<{
  show: boolean;
  taskId: string;
  currentDrawingId?: string;
  projectId?: string;
}>();

const emit = defineEmits<{
  (e: "moved"): void;
  (e: "cancel"): void;
}>();

const api = useApi();
const toast = useToast();

const drawings = ref<any[]>([]);
const selectedDrawingId = ref("");
const loading = ref(false);
const moving = ref(false);
const error = ref("");

const loadDrawings = async () => {
  if (!props.projectId) {
    error.value = "Không tìm thấy projectId";
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    // Fetch all drawings in the same project
    const result = await api.get<any[]>(`/drawings?projectId=${props.projectId}`);
    drawings.value = result || [];
  } catch (err) {
    error.value = (err as Error).message || "Không thể tải danh sách bản vẽ";
  } finally {
    loading.value = false;
  }
};

const handleMove = async () => {
  if (!selectedDrawingId.value || moving.value) return;

  moving.value = true;
  try {
    await api.put(`/tasks/${props.taskId}/move`, {
      drawingId: selectedDrawingId.value
    });
    emit("moved");
  } catch (err) {
    console.error("Move task error:", err);
    toast.push((err as Error).message || "Lỗi khi di chuyển pin/task", "error");
  } finally {
    moving.value = false;
  }
};

watch(() => props.show, (newShow) => {
  if (newShow) {
    selectedDrawingId.value = "";
    void loadDrawings();
  }
});
</script>
