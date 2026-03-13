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
          v-model="localFilters.projectId"
          class="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          @change="onProjectChange"
        >
          <option value="">-- Chọn project --</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <template v-if="localFilters.projectId">
        <div v-if="loadingConvention" class="py-2 text-center text-xs text-slate-400">
          Đang tải cấu hình...
        </div>

        <template v-else>
          <!-- Building Code -->
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Tòa nhà</label>
            <Multiselect
              v-model="localFilters.buildingCodes"
              :options="buildingOptions"
              :multiple="true"
              :searchable="true"
              :close-on-select="false"
              :taggable="true"
              placeholder="Chọn hoặc nhập mã tòa..."
              track-by="value"
              label="label"
              @tag="addTag('buildingCodes', $event)"
              @update:model-value="emitFilters"
            />
          </div>

          <!-- Level Code -->
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Tầng</label>
            <Multiselect
              v-model="localFilters.levelCodes"
              :options="levelOptions"
              :multiple="true"
              :searchable="true"
              :close-on-select="false"
              :taggable="true"
              placeholder="Chọn hoặc nhập mã tầng..."
              track-by="value"
              label="label"
              @tag="addTag('levelCodes', $event)"
              @update:model-value="emitFilters"
            />
          </div>

          <!-- Discipline Code -->
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Bộ môn</label>
            <Multiselect
              v-model="localFilters.disciplineCodes"
              :options="disciplineOptions"
              :multiple="true"
              :searchable="true"
              :close-on-select="false"
              :taggable="true"
              placeholder="Chọn hoặc nhập mã bộ môn..."
              track-by="value"
              label="label"
              @tag="addTag('disciplineCodes', $event)"
              @update:model-value="emitFilters"
            />
          </div>

          <!-- File Type -->
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Loại file</label>
            <select
              v-model="localFilters.fileType"
              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              @change="emitFilters"
            >
              <option value="">Tất cả</option>
              <option value="2d">2D (PDF)</option>
              <option value="3d">3D (IFC)</option>
              <option value="hybrid">Hybrid (2D + 3D)</option>
            </select>
          </div>
        </template>
      </template>

      <!-- Active filter tags -->
      <div v-if="hasActiveFilters" class="flex flex-wrap gap-2">
        <span
          v-for="filter in activeFiltersList"
          :key="filter.key"
          class="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs text-brand-700"
        >
          {{ filter.label }}
          <button class="hover:text-brand-900" @click="removeFilter(filter.key)">
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

type FilterOption = { label: string; value: string };

export type DrawingFilters = {
  projectId: string;
  buildingCodes: FilterOption[];
  levelCodes: FilterOption[];
  disciplineCodes: FilterOption[];
  fileType: string;
};

type KeywordMapping = { code: string; label: string };
type NamingField = { type: string; enabled: boolean; keywords: KeywordMapping[] };

const props = defineProps<{
  projects: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
}>();

const emit = defineEmits<{
  (e: "filter-change", filters: DrawingFilters): void;
}>();

const api = useApi();
const loadingConvention = ref(false);
const conventionFields = ref<NamingField[]>([]);

const localFilters = ref<DrawingFilters>({
  projectId: props.defaultProjectId ?? "",
  buildingCodes: [],
  levelCodes: [],
  disciplineCodes: [],
  fileType: ""
});

const getOptions = (type: string): FilterOption[] => {
  const field = conventionFields.value.find((f) => f.type === type && f.enabled);
  if (!field) return [];
  return field.keywords.map((k) => ({
    label: k.label ? `${k.code} - ${k.label}` : k.code,
    value: k.code
  }));
};

const buildingOptions = computed(() => getOptions("building"));
const levelOptions = computed(() => getOptions("level"));
const disciplineOptions = computed(() => getOptions("discipline"));

const fetchConvention = async (projectId: string) => {
  if (!projectId) { conventionFields.value = []; return; }
  loadingConvention.value = true;
  try {
    const data = await api.get<{ fields: NamingField[] }>(`/naming-conventions/${projectId}`);
    conventionFields.value = data?.fields ?? [];
  } catch {
    conventionFields.value = [];
  } finally {
    loadingConvention.value = false;
  }
};

const onProjectChange = () => {
  localFilters.value.buildingCodes = [];
  localFilters.value.levelCodes = [];
  localFilters.value.disciplineCodes = [];
  localFilters.value.fileType = "";
  fetchConvention(localFilters.value.projectId);
  emitFilters();
};

const addTag = (field: "buildingCodes" | "levelCodes" | "disciplineCodes", tag: string) => {
  const opt = { label: tag.toUpperCase(), value: tag.toUpperCase() };
  localFilters.value[field].push(opt);
  emitFilters();
};

const hasActiveFilters = computed(() =>
  !!localFilters.value.projectId ||
  localFilters.value.buildingCodes.length > 0 ||
  localFilters.value.levelCodes.length > 0 ||
  localFilters.value.disciplineCodes.length > 0 ||
  localFilters.value.fileType !== ""
);

const activeFiltersList = computed(() => {
  const list: Array<{ key: string; label: string }> = [];
  if (localFilters.value.projectId) {
    const name = props.projects.find((p) => p.id === localFilters.value.projectId)?.name;
    if (name) list.push({ key: "project", label: `Project: ${name}` });
  }
  localFilters.value.buildingCodes.forEach((b) =>
    list.push({ key: `building-${b.value}`, label: `Tòa: ${b.value}` })
  );
  localFilters.value.levelCodes.forEach((l) =>
    list.push({ key: `levelCode-${l.value}`, label: `Tầng: ${l.value}` })
  );
  localFilters.value.disciplineCodes.forEach((d) =>
    list.push({ key: `disciplineCode-${d.value}`, label: `BM: ${d.value}` })
  );
  if (localFilters.value.fileType) {
    const labels: Record<string, string> = { "2d": "2D", "3d": "3D", hybrid: "Hybrid" };
    list.push({ key: "fileType", label: `Loại: ${labels[localFilters.value.fileType] || localFilters.value.fileType}` });
  }
  return list;
});

const removeFilter = (key: string) => {
  if (key === "project") {
    localFilters.value.projectId = "";
    localFilters.value.buildingCodes = [];
    localFilters.value.levelCodes = [];
    localFilters.value.disciplineCodes = [];
    conventionFields.value = [];
  } else if (key.startsWith("building-")) {
    const v = key.replace("building-", "");
    localFilters.value.buildingCodes = localFilters.value.buildingCodes.filter((b) => b.value !== v);
  } else if (key.startsWith("levelCode-")) {
    const v = key.replace("levelCode-", "");
    localFilters.value.levelCodes = localFilters.value.levelCodes.filter((l) => l.value !== v);
  } else if (key.startsWith("disciplineCode-")) {
    const v = key.replace("disciplineCode-", "");
    localFilters.value.disciplineCodes = localFilters.value.disciplineCodes.filter((d) => d.value !== v);
  } else if (key === "fileType") {
    localFilters.value.fileType = "";
  }
  emitFilters();
};

const clearAllFilters = () => {
  localFilters.value = { projectId: "", buildingCodes: [], levelCodes: [], disciplineCodes: [], fileType: "" };
  conventionFields.value = [];
  emitFilters();
};

const emitFilters = () => emit("filter-change", { ...localFilters.value });

// Init: load convention for default project
watch(
  () => props.defaultProjectId,
  (id) => {
    if (id) {
      localFilters.value.projectId = id;
      fetchConvention(id);
      emitFilters();
    }
  },
  { immediate: true }
);
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
