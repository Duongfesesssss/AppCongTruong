<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-2xl' }">
    <UCard v-if="localField">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Cấu hình trường: {{ getFieldLabel(localField.type) }}</h3>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" @click="closeModal" />
        </div>
      </template>

      <div class="space-y-4">
        <!-- Required Toggle -->
        <div class="flex items-center justify-between">
          <div>
            <label class="block text-sm font-medium">Bắt buộc (Required)</label>
            <p class="text-xs text-gray-500">Trường này phải có trong tên file</p>
          </div>
          <UToggle v-model="localField.required" />
        </div>

        <!-- Keywords Section (only for certain field types) -->
        <div v-if="shouldShowKeywords">
          <div class="flex items-center justify-between mb-3">
            <label class="block text-sm font-medium">Danh sách keywords</label>
            <UButton color="primary" size="xs" @click="addKeyword"> + Thêm keyword </UButton>
          </div>

          <div class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="(keyword, index) in localField.keywords"
              :key="index"
              class="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div class="flex-1 space-y-2">
                <div class="flex gap-2">
                  <UInput v-model="keyword.code" placeholder="Mã (VD: KT)" class="flex-1" size="sm" />
                  <UInput v-model="keyword.label" placeholder="Nhãn (VD: Kiến trúc)" class="flex-[2]" size="sm" />
                </div>
                <UInput
                  v-model="aliasesText[index]"
                  placeholder="Aliases (phân cách bằng dấu phẩy, VD: KIENTRUC, ARCH)"
                  size="sm"
                  @blur="updateAliases(index)"
                />
              </div>
              <UButton
                color="red"
                variant="ghost"
                size="xs"
                icon="i-heroicons-trash-solid"
                @click="removeKeyword(index)"
              />
            </div>
          </div>

          <p class="text-xs text-gray-500 mt-2">
            Keywords giúp hệ thống nhận diện và map các giá trị trong tên file
          </p>
        </div>

        <div v-else class="text-sm text-gray-500 italic">
          Trường này không cần cấu hình keywords
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" @click="closeModal"> Hủy </UButton>
          <UButton color="primary" @click="saveField"> Lưu </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import type { NamingField, NamingFieldType, KeywordMapping } from "~/types/naming-convention";

const props = defineProps<{
  field: NamingField | null;
  fieldIndex: number;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  save: [field: NamingField];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});

const localField = ref<NamingField | null>(null);
const aliasesText = ref<string[]>([]);

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

const shouldShowKeywords = computed(() => {
  if (!localField.value) return false;
  const type = localField.value.type;
  return ["building", "level", "discipline", "drawingType"].includes(type);
});

const initAliasesText = () => {
  if (!localField.value) return;
  aliasesText.value = localField.value.keywords.map((kw) => (kw.aliases || []).join(", "));
};

const updateAliases = (index: number) => {
  if (!localField.value) return;
  const text = aliasesText.value[index] || "";
  const aliases = text
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  localField.value.keywords[index].aliases = aliases;
};

const addKeyword = () => {
  if (!localField.value) return;
  localField.value.keywords.push({
    code: "",
    label: "",
    aliases: []
  });
  aliasesText.value.push("");
};

const removeKeyword = (index: number) => {
  if (!localField.value) return;
  localField.value.keywords.splice(index, 1);
  aliasesText.value.splice(index, 1);
};

const saveField = () => {
  if (!localField.value) return;

  // Update all aliases before saving
  localField.value.keywords.forEach((_, index) => {
    updateAliases(index);
  });

  // Filter out empty keywords
  localField.value.keywords = localField.value.keywords.filter((kw) => kw.code && kw.label);

  emit("save", localField.value);
  closeModal();
};

const closeModal = () => {
  isOpen.value = false;
};

watch(
  () => props.field,
  (newField) => {
    if (newField) {
      localField.value = JSON.parse(JSON.stringify(newField));
      initAliasesText();
    }
  },
  { immediate: true }
);

watch(isOpen, (newValue) => {
  if (newValue && props.field) {
    localField.value = JSON.parse(JSON.stringify(props.field));
    initAliasesText();
  }
});
</script>
