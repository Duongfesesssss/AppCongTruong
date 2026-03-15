<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[9999] flex items-center justify-center"
      style="background: rgba(0, 0, 0, 0.4)"
      @click.self="$emit('close')"
    >
      <div class="flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Lọc bản vẽ trong cây</h3>
            <p v-if="projectName" class="mt-0.5 text-xs text-slate-400">{{ projectName }}</p>
          </div>
          <button
            class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            @click="$emit('close')"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-5">
          <!-- Loading -->
          <div v-if="loading" class="flex items-center gap-2 py-4 text-xs text-slate-400">
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang tải dữ liệu...
          </div>

          <p v-else-if="!filterFields.length" class="py-3 text-sm text-slate-400">
            Chưa thiết lập quy tắc đặt tên hoặc chưa có bản vẽ nào cho project này.
          </p>

          <div v-else class="space-y-4">
            <div v-for="field in filterFields" :key="field.type">
              <label class="mb-1.5 block text-xs font-medium text-slate-700">{{ field.label }}</label>
              <Multiselect
                v-model="selections[field.type]"
                :options="field.options"
                mode="tags"
                :searchable="true"
                :close-on-select="false"
                :placeholder="`Chọn ${field.label.toLowerCase()}...`"
                no-options-text="Không có dữ liệu"
                no-results-text="Không tìm thấy"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <button
            v-if="hasSelections"
            class="text-sm text-rose-500 hover:text-rose-600"
            @click="clearAll"
          >
            Xóa bộ lọc
          </button>
          <div v-else />
          <div class="flex gap-2">
            <button
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              @click="$emit('close')"
            >
              Hủy
            </button>
            <button
              class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              @click="apply"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Multiselect from "@vueform/multiselect";
import { useApi } from "~/composables/api/useApi";

export type ProjectFilterSelections = Record<string, string[]>;

type FilterField = {
  type: string;
  label: string;
  options: string[];
};

const props = defineProps<{
  show: boolean;
  projectId: string;
  projectName?: string;
  initialSelections?: ProjectFilterSelections;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "apply", selections: ProjectFilterSelections): void;
}>();

const api = useApi();
const loading = ref(false);
const filterFields = ref<FilterField[]>([]);
const selections = ref<ProjectFilterSelections>({});

const hasSelections = computed(() => Object.values(selections.value).some((v) => v.length > 0));

const fetchFilterOptions = async () => {
  if (!props.projectId) {
    filterFields.value = [];
    return;
  }
  loading.value = true;
  try {
    const data = await api.get<FilterField[]>(`/drawings/filter-options?projectId=${props.projectId}`);
    filterFields.value = data ?? [];
    const newSelections: ProjectFilterSelections = {};
    filterFields.value.forEach((f) => {
      newSelections[f.type] = props.initialSelections?.[f.type] ?? [];
    });
    selections.value = newSelections;
  } catch {
    filterFields.value = [];
  } finally {
    loading.value = false;
  }
};

const clearAll = () => {
  const cleared: ProjectFilterSelections = {};
  filterFields.value.forEach((f) => {
    cleared[f.type] = [];
  });
  selections.value = cleared;
};

const apply = () => {
  emit("apply", { ...selections.value });
};

watch(
  () => [props.show, props.projectId] as const,
  ([show]) => {
    if (show) fetchFilterOptions();
  },
  { immediate: true }
);
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
