<template>
  <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-900">Lọc bản vẽ</h3>
      <button
        v-if="hasActiveFilters"
        class="text-xs text-brand-600 hover:text-brand-700"
        @click="clearAllFilters"
      >
        Xoá bộ lọc
      </button>
    </div>

    <div class="space-y-3">
      <!-- Project selector -->
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-700">Project</label>
        <select
          v-model="localProjectId"
          class="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          @change="onProjectChange"
        >
          <option value="">-- Chọn project --</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <template v-if="localProjectId">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center gap-2 py-3 text-xs text-slate-400">
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Đang tải dữ liệu...
        </div>

        <template v-else>
          <!-- No data -->
          <p v-if="!filterFields.length" class="py-2 text-xs text-slate-400">
            Chưa có bản vẽ nào được tải lên hoặc chưa thiết lập quy tắc đặt tên.
          </p>

          <!-- Dynamic multiselect per convention field -->
          <div v-for="field in filterFields" :key="field.type">
            <label
              class="mb-1 block text-xs font-medium"
              :class="field.options.length ? 'text-slate-700' : 'text-slate-400'"
            >
              {{ field.label }}
              <span v-if="!field.options.length" class="ml-1 font-normal">(chưa có dữ liệu)</span>
            </label>
            <Multiselect
              v-model="selections[field.type]"
              :options="field.options"
              mode="tags"
              :searchable="true"
              :close-on-select="false"
              :disabled="!field.options.length"
              :placeholder="field.options.length ? `Chọn ${field.label.toLowerCase()}...` : 'Chưa có dữ liệu'"
              no-options-text="Không có dữ liệu"
              no-results-text="Không tìm thấy"
            />
          </div>

          <!-- File Type -->
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Loại file</label>
            <select
              v-model="fileType"
              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            >
              <option value="">Tất cả</option>
              <option value="2d">2D (PDF)</option>
              <option value="3d">3D (IFC)</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </template>
      </template>

      <!-- Active filter tags -->
      <div v-if="hasActiveFilters" class="flex flex-wrap gap-1.5">
        <span
          v-for="tag in activeTagsList"
          :key="tag.key"
          class="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs text-brand-700"
        >
          {{ tag.label }}
          <button class="hover:text-brand-900" @click="removeTag(tag)">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Multiselect from "@vueform/multiselect";
import { useApi } from "~/composables/api/useApi";

export type DrawingFilters = {
  projectId: string;
  // Dynamic per-field selections: fieldType → selected values[]
  fieldSelections: Record<string, string[]>;
  fileType: string;
};

type FilterField = {
  type: string;
  label: string;
  options: string[];
};

const props = defineProps<{
  projects: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
}>();

const emit = defineEmits<{
  (e: "filter-change", filters: DrawingFilters): void;
}>();

const api = useApi();
const loading = ref(false);
const localProjectId = ref(props.defaultProjectId ?? "");
const filterFields = ref<FilterField[]>([]);
const selections = ref<Record<string, string[]>>({});
const fileType = ref("");

const fetchFilterOptions = async (projectId: string) => {
  if (!projectId) { filterFields.value = []; return; }
  loading.value = true;
  try {
    const data = await api.get<FilterField[]>(`/drawings/filter-options?projectId=${projectId}`);
    filterFields.value = data ?? [];
    // Init selections for new fields, keep existing ones
    const newSelections: Record<string, string[]> = {};
    filterFields.value.forEach((f) => {
      newSelections[f.type] = selections.value[f.type] ?? [];
    });
    selections.value = newSelections;
  } catch {
    filterFields.value = [];
  } finally {
    loading.value = false;
  }
};

const onProjectChange = () => {
  selections.value = {};
  fileType.value = "";
  fetchFilterOptions(localProjectId.value);
  emitFilters();
};

const hasActiveFilters = computed(() => {
  if (!localProjectId.value) return false;
  if (fileType.value) return true;
  return Object.values(selections.value).some((v) => v.length > 0);
});

const activeTagsList = computed(() => {
  const tags: Array<{ key: string; label: string; fieldType: string; value: string }> = [];
  filterFields.value.forEach((field) => {
    (selections.value[field.type] ?? []).forEach((val) => {
      tags.push({
        key: `${field.type}:${val}`,
        label: `${field.label}: ${val}`,
        fieldType: field.type,
        value: val
      });
    });
  });
  if (fileType.value) {
    const labels: Record<string, string> = { "2d": "2D", "3d": "3D", hybrid: "Hybrid" };
    tags.push({ key: "fileType", label: `Loại: ${labels[fileType.value] || fileType.value}`, fieldType: "fileType", value: fileType.value });
  }
  return tags;
});

const removeTag = (tag: { fieldType: string; value: string }) => {
  if (tag.fieldType === "fileType") {
    fileType.value = "";
  } else {
    selections.value[tag.fieldType] = (selections.value[tag.fieldType] ?? []).filter((v) => v !== tag.value);
  }
  emitFilters();
};

const clearAllFilters = () => {
  selections.value = {};
  fileType.value = "";
  emitFilters();
};

const emitFilters = () => {
  emit("filter-change", {
    projectId: localProjectId.value,
    fieldSelections: { ...selections.value },
    fileType: fileType.value
  });
};

// Init on defaultProjectId
watch(
  () => props.defaultProjectId,
  (id) => {
    if (id && id !== localProjectId.value) {
      localProjectId.value = id;
      fetchFilterOptions(id);
      emitFilters();
    }
  },
  { immediate: true }
);

// Đồng bộ filter lên parent mỗi khi state thay đổi để đảm bảo query luôn đúng.
watch(
  [localProjectId, fileType, selections],
  () => {
    emitFilters();
  },
  { deep: true }
);
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
