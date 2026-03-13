<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div class="flex w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" style="max-height: 90dvh">
          <!-- Header -->
          <div class="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-slate-900 sm:text-lg">Cấu hình Naming Convention</h3>
                <p class="truncate text-xs text-slate-500">{{ projectName || "Quy tắc đặt tên file bản vẽ" }}</p>
              </div>
              <button
                class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                type="button"
                @click="emit('close')"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div v-if="isLoading" class="flex items-center justify-center py-12">
              <svg class="h-6 w-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>

            <div v-else class="space-y-6">
              <!-- Separator -->
              <div>
                <label class="block text-sm font-semibold text-slate-800 mb-1">Ký tự phân cách (Separator)</label>
                <input
                  v-model="localConvention.separator"
                  type="text"
                  class="input w-24"
                  placeholder="-"
                  maxlength="5"
                />
                <p class="mt-1 text-xs text-slate-500">Ký tự dùng để phân cách các trường (ví dụ: -, _, .)</p>
              </div>

              <!-- Format Preview -->
              <div v-if="formatPreview" class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p class="text-xs font-medium text-slate-600 mb-1">Format hiện tại:</p>
                <code class="text-sm font-mono text-brand-700 break-all">{{ formatPreview }}</code>
              </div>

              <!-- Fields Configuration -->
              <div>
                <div class="mb-3 flex items-center justify-between">
                  <label class="text-sm font-semibold text-slate-800">Cấu hình trường (Fields)</label>
                  <p class="text-xs text-slate-400">Kéo thả để sắp xếp thứ tự</p>
                </div>

                <div class="space-y-2">
                  <div
                    v-for="(field, index) in localConvention.fields"
                    :key="field.type"
                    draggable="true"
                    class="flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition-colors"
                    :class="[
                      field.enabled ? 'border-slate-200' : 'border-slate-100 opacity-50',
                      dragOverIndex === index ? 'border-brand-400 bg-brand-50' : ''
                    ]"
                    @dragstart="onDragStart(index)"
                    @dragover.prevent="onDragOver(index)"
                    @dragleave="onDragLeave"
                    @drop="onDrop(index)"
                    @dragend="onDragEnd"
                  >
                    <!-- Drag handle -->
                    <div class="shrink-0 cursor-move text-slate-300 hover:text-slate-500">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                      </svg>
                    </div>

                    <!-- Order badge -->
                    <span class="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                      {{ index + 1 }}
                    </span>

                    <!-- Field Info -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-medium text-sm text-slate-800">{{ getFieldLabel(field.type) }}</span>
                        <span class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-500">{{ field.type }}</span>
                        <span v-if="field.required" class="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-600">Bắt buộc</span>
                      </div>
                      <p class="text-xs text-slate-400 mt-0.5">{{ field.keywords.length }} keywords</p>
                    </div>

                    <!-- Actions -->
                    <div class="shrink-0 flex items-center gap-2">
                      <!-- Toggle enable -->
                      <button
                        type="button"
                        class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                        :class="field.enabled ? 'bg-brand-600' : 'bg-slate-200'"
                        role="switch"
                        :aria-checked="field.enabled"
                        @click="field.enabled = !field.enabled; updateFormatPreview()"
                      >
                        <span
                          class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          :class="field.enabled ? 'translate-x-4' : 'translate-x-0'"
                        />
                      </button>

                      <!-- Edit keywords -->
                      <button
                        type="button"
                        class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Cấu hình keywords"
                        @click="editField(field, index)"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Validation Errors -->
              <div v-if="validationErrors.length > 0" class="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p class="text-sm font-medium text-rose-800 mb-1">Lỗi validation:</p>
                <ul class="text-sm text-rose-700 list-disc list-inside space-y-0.5">
                  <li v-for="(error, i) in validationErrors" :key="i">{{ error }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              :disabled="isSaving || isLoading"
              @click="resetToDefault"
            >
              Reset mặc định
            </button>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                @click="emit('close')"
              >
                Hủy
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isSaving || isLoading"
                @click="saveConvention"
              >
                <svg v-if="isSaving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ isSaving ? "Đang lưu..." : "Lưu" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Field Edit Modal -->
    <FieldEditModal
      :show="isFieldEditOpen"
      :field="editingField"
      @close="isFieldEditOpen = false"
      @save="onFieldSaved"
    />
  </Teleport>
</template>

<script setup lang="ts">
import type { NamingConvention, NamingField, NamingFieldType } from "~/types/naming-convention";
import FieldEditModal from "./FieldEditModal.vue";
import { useNamingConvention } from "~/composables/api/useNamingConvention";
import { useToast } from "~/composables/state/useToast";

const props = defineProps<{
  show: boolean;
  projectId: string;
  projectName?: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [convention: NamingConvention];
}>();

const { getNamingConvention, createOrUpdateNamingConvention } = useNamingConvention();
const toast = useToast();

const localConvention = ref<NamingConvention>({
  projectId: props.projectId,
  separator: "-",
  fields: []
});

const isSaving = ref(false);
const isLoading = ref(false);
const validationErrors = ref<string[]>([]);
const formatPreview = ref("");

// Field edit
const isFieldEditOpen = ref(false);
const editingField = ref<NamingField | null>(null);
const editingFieldIndex = ref(-1);

// Drag state
const dragIndex = ref(-1);
const dragOverIndex = ref(-1);

const fieldLabels: Record<NamingFieldType, string> = {
  projectPrefix: "Mã dự án",
  building: "Tòa nhà/Khu",
  level: "Tầng",
  discipline: "Bộ môn",
  drawingType: "Loại bản vẽ",
  runningNumber: "Số thứ tự",
  description: "Mô tả"
};

const getFieldLabel = (type: NamingFieldType) => fieldLabels[type] || type;

const loadConvention = async () => {
  if (!props.projectId) return;
  isLoading.value = true;
  try {
    const convention = await getNamingConvention(props.projectId);
    localConvention.value = { ...convention };
    updateFormatPreview();
  } catch {
    toast.push("Không thể tải cấu hình naming convention", "error");
  } finally {
    isLoading.value = false;
  }
};

const updateFormatPreview = () => {
  const enabledFields = [...localConvention.value.fields]
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  const parts = enabledFields.map((field) => {
    const wrap = !field.required;
    let placeholder = "";
    switch (field.type) {
      case "projectPrefix": placeholder = "ABC"; break;
      case "building": placeholder = field.keywords[0]?.code || "HQ"; break;
      case "level": placeholder = field.keywords[0]?.code || "L1"; break;
      case "discipline": placeholder = field.keywords[0]?.code || "KT"; break;
      case "drawingType": placeholder = field.keywords[0]?.code || "MB"; break;
      case "runningNumber": placeholder = "001"; break;
      case "description": placeholder = "Description"; break;
    }
    return wrap ? `[${placeholder}]` : placeholder;
  });

  formatPreview.value = parts.join(localConvention.value.separator);
};

// Drag handlers
const onDragStart = (index: number) => {
  dragIndex.value = index;
};
const onDragOver = (index: number) => {
  dragOverIndex.value = index;
};
const onDragLeave = () => {
  dragOverIndex.value = -1;
};
const onDrop = (toIndex: number) => {
  const fromIndex = dragIndex.value;
  if (fromIndex === -1 || fromIndex === toIndex) return;
  const fields = [...localConvention.value.fields];
  const [moved] = fields.splice(fromIndex, 1);
  fields.splice(toIndex, 0, moved);
  fields.forEach((f, i) => { f.order = i; });
  localConvention.value.fields = fields;
  updateFormatPreview();
};
const onDragEnd = () => {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
};

const editField = (field: NamingField, index: number) => {
  editingField.value = JSON.parse(JSON.stringify(field));
  editingFieldIndex.value = index;
  isFieldEditOpen.value = true;
};

const onFieldSaved = (updatedField: NamingField) => {
  if (editingFieldIndex.value >= 0) {
    localConvention.value.fields[editingFieldIndex.value] = updatedField;
    updateFormatPreview();
  }
};

const validateConvention = (): boolean => {
  validationErrors.value = [];
  const enabledFields = localConvention.value.fields.filter((f) => f.enabled);
  if (enabledFields.length === 0) {
    validationErrors.value.push("Phải có ít nhất 1 trường được bật");
    return false;
  }
  if (!localConvention.value.separator) {
    validationErrors.value.push("Separator không được để trống");
    return false;
  }
  return true;
};

const saveConvention = async () => {
  if (!validateConvention()) return;
  isSaving.value = true;
  try {
    const saved = await createOrUpdateNamingConvention({
      projectId: props.projectId,
      separator: localConvention.value.separator,
      fields: localConvention.value.fields
    });
    toast.push("Đã lưu cấu hình naming convention", "success");
    emit("saved", saved);
    emit("close");
  } catch (err: any) {
    toast.push(err?.message || "Không thể lưu cấu hình naming convention", "error");
  } finally {
    isSaving.value = false;
  }
};

const resetToDefault = async () => {
  await loadConvention();
  toast.push("Đã reset về cấu hình đang lưu", "info");
};

watch(
  () => props.show,
  (val) => {
    if (val) {
      validationErrors.value = [];
      void loadConvention();
    }
  }
);

watch(() => localConvention.value.separator, updateFormatPreview);
</script>
