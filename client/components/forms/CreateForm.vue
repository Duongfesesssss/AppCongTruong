<template>
  <FormModal :show="show" :title="title" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- Project -->
      <template v-if="type === 'project'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên dự án <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Chung cư ABC" required />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Mô tả</label>
          <textarea v-model="form.description" class="input" rows="2" placeholder="Mô tả dự án..."></textarea>
        </div>
      </template>

      <!-- Building -->
      <template v-else-if="type === 'building'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên toà nhà <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Toà A" required />
        </div>
      </template>

      <!-- Floor -->
      <template v-else-if="type === 'floor'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên tầng <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Tầng 1" required />
        </div>
      </template>

      <!-- Discipline -->
      <template v-else-if="type === 'discipline'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên bộ môn <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Điện, Nước, PCCC..." required />
        </div>
      </template>

      <!-- Drawing -->
      <template v-else-if="type === 'drawing'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên bản vẽ <span class="text-rose-400">*</span></label>
          <input v-model="form.name" type="text" class="input" placeholder="VD: Mặt bằng điện tầng 1" required />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">File PDF <span class="text-rose-400">*</span></label>
          <input type="file" class="input" accept="application/pdf" @change="handleFileChange" required />
        </div>
      </template>

      <!-- Task -->
      <template v-else-if="type === 'task'">
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên Pin</label>
          <input v-model="form.pinName" type="text" class="input" placeholder="VD: Điểm đo 1" list="pin-suggestions" @change="onPinNameSelect" />
          <datalist id="pin-suggestions">
            <option v-for="s in pinSuggestions" :key="s.pinName" :value="s.pinName">
              {{ s.pinCode }} · {{ s.roomName || '' }}
            </option>
          </datalist>
          <p v-if="pinSuggestions.length" class="mt-1 text-[11px] text-slate-400">Gợi ý từ các pin đã tạo trong dự án</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</label>
            <select v-model="form.status" class="input">
              <option value="open">Mở</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="blocked">Chặn</option>
              <option value="done">Hoàn thành</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Loại</label>
            <select v-model="form.category" class="input">
              <option value="quality">Chất lượng</option>
              <option value="safety">An toàn</option>
              <option value="progress">Tiến độ</option>
              <option value="fire_protection">Chống cháy</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>
        <div>
          <div class="mb-1 flex items-center justify-between gap-2">
            <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">Phòng</label>
            <input
              ref="roomImportInput"
              type="file"
              accept=".xlsx,.xls"
              class="hidden"
              @change="handleRoomImport"
            />
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                @click="downloadRoomTemplate"
              >
                Tải mẫu
              </button>
              <button
                type="button"
                class="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                :disabled="importingRooms"
                @click="triggerRoomImport"
              >
                {{ importingRooms ? "Đang import..." : "Import Excel" }}
              </button>
            </div>
          </div>
          <input
            v-model="form.roomName"
            type="text"
            class="input"
            placeholder="VD: Phòng khách"
            list="room-suggestions"
          />
          <datalist id="room-suggestions">
            <option
              v-for="room in roomSuggestions"
              :key="`${room.roomName}-${room.roomCode || ''}`"
              :value="room.roomName"
            >
              {{ room.roomCode ? `${room.roomCode} · ${room.roomName}` : room.roomName }}
            </option>
          </datalist>
          <p v-if="importingRooms" class="mt-1 text-[11px] text-brand-600">Đang xử lý file Excel phòng...</p>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Mô tả</label>
          <textarea v-model="form.description" class="input" rows="2" placeholder="Mô tả chi tiết..."></textarea>
        </div>
      </template>

      <div v-if="errorMsg" class="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-600">
        {{ errorMsg }}
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          @click="$emit('close')"
        >
          Huỷ
        </button>
        <button
          type="submit"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="submitting"
        >
          {{ submitting ? "Đang tạo..." : "Tạo mới" }}
        </button>
      </div>
    </form>
  </FormModal>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";
import { useProjectTree } from "~/composables/api/useProjectTree";

export type CreateFormType = "project" | "building" | "floor" | "discipline" | "drawing" | "task";

const props = defineProps<{
  show: boolean;
  type: CreateFormType;
  parentId?: string;
  initialPinX?: number;
  initialPinY?: number;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "created", data: unknown): void;
}>();

const api = useApi();
const toast = useToast();
const { fetchTree } = useProjectTree();

const submitting = ref(false);
const errorMsg = ref("");
const uploadFile = ref<File | null>(null);

// #13/#14 Pin suggestions for autofill
type PinSuggestion = {
  pinName: string;
  pinCode: string;
  roomName?: string;
  status?: string;
  category?: string;
  description?: string;
};
const pinSuggestions = ref<PinSuggestion[]>([]);
type RoomSuggestion = { roomName: string; roomCode?: string };
const roomSuggestions = ref<RoomSuggestion[]>([]);
const roomImportInput = ref<HTMLInputElement | null>(null);
const importingRooms = ref(false);

const taskDraftKey = computed(() => `task-form-draft:${props.parentId || "unknown"}`);

const fetchPinSuggestions = async () => {
  if (props.type !== "task" || !props.parentId) { pinSuggestions.value = []; return; }
  try {
    const data = await api.get<PinSuggestion[]>(`/tasks/pin-suggestions?drawingId=${props.parentId}`);
    pinSuggestions.value = data || [];
  } catch { pinSuggestions.value = []; }
};

const fetchRoomSuggestions = async () => {
  if (props.type !== "task" || !props.parentId) {
    roomSuggestions.value = [];
    return;
  }

  try {
    const data = await api.get<RoomSuggestion[]>(`/rooms/suggestions?drawingId=${props.parentId}`);
    roomSuggestions.value = data || [];
  } catch {
    roomSuggestions.value = [];
  }
};

const triggerRoomImport = () => {
  if (props.type !== "task") return;
  roomImportInput.value?.click();
};

const downloadRoomTemplate = async () => {
  if (!process.client) return;
  try {
    const XLSX = await import("xlsx");
    const rows = [
      { roomCode: "P101", roomName: "Phòng 101", building: "Toà A", floor: "Tầng 1" },
      { roomCode: "P102", roomName: "Phòng 102", building: "Toà A", floor: "Tầng 1" },
      { roomCode: "KHO-01", roomName: "Kho vật tư", building: "Toà B", floor: "Tầng 2" }
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rooms");
    XLSX.writeFile(workbook, "mau-import-phong.xlsx");
    toast.push("Đã tải file mẫu import phòng", "success");
  } catch {
    toast.push("Không thể tạo file mẫu", "error");
  }
};

const handleRoomImport = async (event: Event) => {
  if (!props.parentId) return;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importingRooms.value = true;
  try {
    const formData = new FormData();
    formData.append("drawingId", props.parentId);
    formData.append("file", file);
    const result = await api.upload<{ imported: number; skipped: number; totalRows: number }>("/rooms/import-excel", formData);
    toast.push(`Import phòng: ${result.imported}/${result.totalRows} dòng`, "success");
    await fetchRoomSuggestions();
  } catch (err) {
    toast.push((err as Error).message || "Lỗi import phòng", "error");
  } finally {
    importingRooms.value = false;
    input.value = "";
  }
};

const saveTaskDraft = () => {
  if (!process.client || props.type !== "task") return;
  const draft = {
    pinName: form.pinName,
    roomName: form.roomName,
    description: form.description,
    status: form.status,
    category: form.category
  };
  try {
    localStorage.setItem(taskDraftKey.value, JSON.stringify(draft));
  } catch {
    // Ignore localStorage errors
  }
};

const clearTaskDraft = () => {
  if (!process.client || props.type !== "task") return;
  try {
    localStorage.removeItem(taskDraftKey.value);
  } catch {
    // Ignore localStorage errors
  }
};

const restoreTaskDraft = () => {
  if (!process.client || props.type !== "task") return;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(taskDraftKey.value);
  } catch {
    raw = null;
  }
  if (!raw) return;

  try {
    const draft = JSON.parse(raw) as Partial<typeof form>;
    form.pinName = draft.pinName || "";
    form.roomName = draft.roomName || "";
    form.description = draft.description || "";
    form.status = (draft.status as string) || "open";
    form.category = (draft.category as string) || "quality";
  } catch {
    // Ignore malformed draft
  }
};

const onPinNameSelect = () => {
  // Auto-fill full form from matching suggestion
  const match = pinSuggestions.value.find((s) => s.pinName === form.pinName);
  if (match) {
    if (match.roomName && !form.roomName) form.roomName = match.roomName;
    if (match.status) form.status = match.status;
    if (match.category) form.category = match.category;
    if (match.description && !form.description) form.description = match.description;
  }
};

const form = reactive({
  name: "",
  description: "",
  pinName: "",
  roomName: "",
  status: "open",
  category: "quality",
  pinX: 0.5,
  pinY: 0.5
});

const title = computed(() => {
  const titles: Record<CreateFormType, string> = {
    project: "Tạo dự án mới",
    building: "Tạo toà nhà mới",
    floor: "Tạo tầng mới",
    discipline: "Tạo bộ môn mới",
    drawing: "Tải lên bản vẽ",
    task: "Tạo Task/Pin mới"
  };
  return titles[props.type];
});

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    uploadFile.value = input.files[0];
  }
};

const resetForm = () => {
  form.name = "";
  form.description = "";
  form.pinName = "";
  form.roomName = "";
  form.status = "open";
  form.category = "quality";
  form.pinX = props.initialPinX ?? 0.5;
  form.pinY = props.initialPinY ?? 0.5;
  uploadFile.value = null;
  errorMsg.value = "";
};

const handleSubmit = async () => {
  submitting.value = true;
  errorMsg.value = "";

  try {
    let result: unknown;

    switch (props.type) {
      case "project":
        result = await api.post("/projects", {
          name: form.name,
          description: form.description || undefined
        });
        break;

      case "building":
        result = await api.post("/buildings", {
          projectId: props.parentId,
          name: form.name
        });
        break;

      case "floor":
        result = await api.post("/floors", {
          buildingId: props.parentId,
          name: form.name
        });
        break;

      case "discipline":
        result = await api.post("/disciplines", {
          floorId: props.parentId,
          name: form.name
        });
        break;

      case "drawing": {
        if (!uploadFile.value) {
          errorMsg.value = "Vui lòng chọn file PDF";
          return;
        }
        const formData = new FormData();
        formData.append("disciplineId", props.parentId || "");
        formData.append("name", form.name);
        formData.append("file", uploadFile.value);
        result = await api.upload("/drawings", formData);
        break;
      }

      case "task":
        result = await api.post("/tasks", {
          drawingId: props.parentId,
          pinName: form.pinName || undefined,
          roomName: form.roomName || undefined,
          description: form.description || undefined,
          status: form.status,
          category: form.category,
          pinX: form.pinX,
          pinY: form.pinY
        });
        break;
    }

    toast.push(`Tạo ${props.type} thành công`, "success");
    if (props.type === "task") {
      clearTaskDraft();
    }
    await fetchTree();
    resetForm();
    emit("created", result);
    emit("close");
  } catch (err) {
    errorMsg.value = (err as Error).message || "Lỗi khi tạo";
  } finally {
    submitting.value = false;
  }
};

// Reset form khi đóng modal, áp dụng toạ độ khi mở
watch(() => props.show, (newVal) => {
  if (!newVal) {
    resetForm();
  } else if (props.type === "task") {
    form.pinX = props.initialPinX ?? 0.5;
    form.pinY = props.initialPinY ?? 0.5;
    fetchPinSuggestions();
    fetchRoomSuggestions();
    restoreTaskDraft();
  }
});

watch(
  () => [form.pinName, form.roomName, form.description, form.status, form.category, props.show],
  () => {
    if (!props.show || props.type !== "task") return;
    saveTaskDraft();
  }
);
</script>
