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
        <!-- Hiển thị vị trí pin đã chọn -->
        <div class="flex items-center gap-2 rounded-lg bg-brand-50 border border-brand-200 p-2">
          <svg class="h-4 w-4 shrink-0 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-xs text-brand-700">
            Vị trí pin: X={{ form.pinX.toFixed(2) }}, Y={{ form.pinY.toFixed(2) }}
          </span>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tên Pin</label>
          <input v-model="form.pinName" type="text" class="input" placeholder="VD: Điểm đo 1" />
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
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Phòng</label>
          <input v-model="form.roomName" type="text" class="input" placeholder="VD: Phòng khách" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Bộ phận thi công</label>
          <input v-model="form.gewerk" type="text" class="input" placeholder="VD: EL (Điện), HE (Sưởi), SA (Vệ sinh)..." />
          <p class="mt-1 text-[11px] text-slate-400">Viết tắt ngành nghề, dùng để sinh mã pin</p>
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

const form = reactive({
  name: "",
  description: "",
  pinName: "",
  roomName: "",
  gewerk: "",
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
  form.gewerk = "";
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
          gewerk: form.gewerk || undefined,
          description: form.description || undefined,
          status: form.status,
          category: form.category,
          pinX: form.pinX,
          pinY: form.pinY
        });
        break;
    }

    toast.push(`Tạo ${props.type} thành công`, "success");
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
  }
});
</script>
