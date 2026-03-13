<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-4xl' }">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Cấu hình Naming Convention</h3>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" @click="closeModal" />
        </div>
      </template>

      <div class="space-y-6">
        <!-- Separator Config -->
        <div>
          <label class="block text-sm font-medium mb-2">Ký tự phân cách (Separator)</label>
          <UInput v-model="localConvention.separator" placeholder="-" maxlength="5" class="max-w-xs" />
          <p class="text-xs text-gray-500 mt-1">Ký tự dùng để phân cách các trường (ví dụ: -, _, .)</p>
        </div>

        <!-- Format Preview -->
        <div v-if="formatPreview" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <p class="text-sm font-medium mb-1">Format hiện tại:</p>
          <code class="text-sm text-blue-600 dark:text-blue-400">{{ formatPreview }}</code>
        </div>

        <!-- Fields Configuration -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label class="block text-sm font-medium">Cấu hình trường (Fields)</label>
            <p class="text-xs text-gray-500">Kéo thả để sắp xếp thứ tự</p>
          </div>

          <div class="space-y-2">
            <draggable
              v-model="localConvention.fields"
              item-key="type"
              handle=".drag-handle"
              @end="updateFieldOrders"
            >
              <template #item="{ element: field, index }">
                <div
                  class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border rounded-lg"
                  :class="{ 'opacity-50': !field.enabled }"
                >
                  <!-- Drag Handle -->
                  <div class="drag-handle cursor-move text-gray-400 hover:text-gray-600">
                    <UIcon name="i-heroicons-bars-3-solid" class="w-5 h-5" />
                  </div>

                  <!-- Field Info -->
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm">{{ getFieldLabel(field.type) }}</span>
                      <span class="text-xs text-gray-500">({{ field.type }})</span>
                      <UBadge v-if="field.required" color="red" size="xs">Bắt buộc</UBadge>
                    </div>
                    <p class="text-xs text-gray-500 mt-0.5">
                      {{ field.keywords.length }} keywords
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2">
                    <UToggle v-model="field.enabled" @change="onFieldEnabledChange(field)" />
                    <UButton
                      color="gray"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-cog-6-tooth-solid"
                      @click="editField(field, index)"
                    />
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </div>

        <!-- Validation Errors -->
        <div v-if="validationErrors.length > 0" class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <p class="text-sm font-medium text-red-800 dark:text-red-400 mb-1">Lỗi validation:</p>
          <ul class="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
            <li v-for="(error, i) in validationErrors" :key="i">{{ error }}</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between items-center">
          <UButton color="gray" variant="ghost" @click="resetToDefault" :disabled="isSaving">
            Reset về mặc định
          </UButton>
          <div class="flex gap-2">
            <UButton color="gray" variant="ghost" @click="closeModal" :disabled="isSaving"> Hủy </UButton>
            <UButton color="primary" @click="saveConvention" :loading="isSaving"> Lưu </UButton>
          </div>
        </div>
      </template>
    </UCard>

    <!-- Field Edit Modal -->
    <FieldEditModal
      v-model="isFieldEditOpen"
      :field="editingField"
      :field-index="editingFieldIndex"
      @save="onFieldSaved"
    />
  </UModal>
</template>

<script setup lang="ts">
import draggable from "vuedraggable";
import type { NamingConvention, NamingField, NamingFieldType } from "~/types/naming-convention";
import FieldEditModal from "./FieldEditModal.vue";

const props = defineProps<{
  projectId: string;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [convention: NamingConvention];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});

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

// Field Edit Modal
const isFieldEditOpen = ref(false);
const editingField = ref<NamingField | null>(null);
const editingFieldIndex = ref(-1);

const fieldLabels: Record<NamingFieldType, string> = {
  projectPrefix: "Mã dự án",
  building: "Tòa nhà/Khu",
  level: "Tầng",
  discipline: "Bộ môn",
  drawingType: "Loại bản vẽ",
  runningNumber: "Số thứ tự",
  description: "Mô tả"
};

const getFieldLabel = (type: NamingFieldType) => {
  return fieldLabels[type] || type;
};

const loadConvention = async () => {
  isLoading.value = true;
  try {
    const convention = await getNamingConvention(props.projectId);
    localConvention.value = { ...convention };
    updateFormatPreview();
  } catch (error) {
    console.error("Failed to load naming convention:", error);
    toast.add({
      title: "Lỗi",
      description: "Không thể tải cấu hình naming convention",
      color: "red"
    });
  } finally {
    isLoading.value = false;
  }
};

const updateFormatPreview = () => {
  const enabledFields = localConvention.value.fields
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  const parts = enabledFields.map((field) => {
    const prefix = field.required ? "" : "[";
    const suffix = field.required ? "" : "]";
    let placeholder = "";

    switch (field.type) {
      case "projectPrefix":
        placeholder = "ABC";
        break;
      case "building":
        placeholder = field.keywords[0]?.code || "HQ";
        break;
      case "level":
        placeholder = field.keywords[0]?.code || "L1";
        break;
      case "discipline":
        placeholder = field.keywords[0]?.code || "KT";
        break;
      case "drawingType":
        placeholder = field.keywords[0]?.code || "MB";
        break;
      case "runningNumber":
        placeholder = "001";
        break;
      case "description":
        placeholder = "Description";
        break;
    }

    return `${prefix}${placeholder}${suffix}`;
  });

  formatPreview.value = parts.join(localConvention.value.separator);
};

const updateFieldOrders = () => {
  localConvention.value.fields.forEach((field, index) => {
    field.order = index;
  });
  updateFormatPreview();
};

const onFieldEnabledChange = (field: NamingField) => {
  updateFormatPreview();
};

const editField = (field: NamingField, index: number) => {
  editingField.value = { ...field };
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

  const enabledTypes = enabledFields.map((f) => f.type);
  const uniqueTypes = new Set(enabledTypes);
  if (enabledTypes.length !== uniqueTypes.size) {
    validationErrors.value.push("Không được có 2 trường cùng type và enabled");
    return false;
  }

  if (!localConvention.value.separator || localConvention.value.separator.length === 0) {
    validationErrors.value.push("Separator không được để trống");
    return false;
  }

  return true;
};

const saveConvention = async () => {
  if (!validateConvention()) {
    return;
  }

  isSaving.value = true;
  try {
    const saved = await createOrUpdateNamingConvention({
      projectId: props.projectId,
      separator: localConvention.value.separator,
      fields: localConvention.value.fields
    });

    toast.add({
      title: "Thành công",
      description: "Đã lưu cấu hình naming convention",
      color: "green"
    });

    emit("saved", saved);
    closeModal();
  } catch (error: any) {
    console.error("Failed to save naming convention:", error);
    toast.add({
      title: "Lỗi",
      description: error?.message || "Không thể lưu cấu hình naming convention",
      color: "red"
    });
  } finally {
    isSaving.value = false;
  }
};

const resetToDefault = async () => {
  await loadConvention();
  toast.add({
    title: "Đã reset",
    description: "Đã reset về cấu hình mặc định",
    color: "blue"
  });
};

const closeModal = () => {
  isOpen.value = false;
};

watch(isOpen, (newValue) => {
  if (newValue) {
    loadConvention();
  }
});

watch(
  () => localConvention.value.separator,
  () => {
    updateFormatPreview();
  }
);
</script>
