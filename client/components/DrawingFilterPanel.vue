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
      <!-- Building Filter -->
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-700">Tòa nhà</label>
        <Multiselect
          v-model="localFilters.buildingIds"
          :options="buildingOptions"
          :multiple="true"
          :searchable="true"
          :close-on-select="false"
          placeholder="Chọn tòa nhà..."
          track-by="value"
          label="label"
          @update:model-value="emitFilters"
        />
      </div>

      <!-- Floor Filter -->
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-700">Tầng</label>
        <Multiselect
          v-model="localFilters.floorIds"
          :options="floorOptions"
          :multiple="true"
          :searchable="true"
          :close-on-select="false"
          placeholder="Chọn tầng..."
          track-by="value"
          label="label"
          @update:model-value="emitFilters"
        />
      </div>

      <!-- Discipline Filter -->
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-700">Bộ môn</label>
        <Multiselect
          v-model="localFilters.disciplineIds"
          :options="disciplineOptions"
          :multiple="true"
          :searchable="true"
          :close-on-select="false"
          placeholder="Chọn bộ môn..."
          track-by="value"
          label="label"
          @update:model-value="emitFilters"
        />
      </div>

      <!-- Level Code Filter (from parsed metadata) -->
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-700">Mã tầng (Metadata)</label>
        <Multiselect
          v-model="localFilters.levelCodes"
          :options="levelCodeOptions"
          :multiple="true"
          :searchable="true"
          :close-on-select="false"
          :taggable="true"
          placeholder="Chọn hoặc nhập mã tầng..."
          track-by="value"
          label="label"
          @tag="addLevelCodeTag"
          @update:model-value="emitFilters"
        />
      </div>

      <!-- Discipline Code Filter (from parsed metadata) -->
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-700">Mã bộ môn (Metadata)</label>
        <Multiselect
          v-model="localFilters.disciplineCodes"
          :options="disciplineCodeOptions"
          :multiple="true"
          :searchable="true"
          :close-on-select="false"
          :taggable="true"
          placeholder="Chọn hoặc nhập mã bộ môn..."
          track-by="value"
          label="label"
          @tag="addDisciplineCodeTag"
          @update:model-value="emitFilters"
        />
      </div>

      <!-- File Type Filter -->
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

      <!-- Active Filters Display -->
      <div v-if="hasActiveFilters" class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="filter in activeFiltersList"
          :key="filter.key"
          class="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs text-brand-700"
        >
          {{ filter.label }}
          <button
            class="hover:text-brand-900"
            @click="removeFilter(filter.key)"
          >
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

type FilterOption = {
  label: string;
  value: string;
};

type DrawingFilters = {
  buildingIds: FilterOption[];
  floorIds: FilterOption[];
  disciplineIds: FilterOption[];
  levelCodes: FilterOption[];
  disciplineCodes: FilterOption[];
  fileType: string;
};

const props = defineProps<{
  projectId?: string;
  buildings?: Array<{ _id: string; name: string; code: string }>;
  floors?: Array<{ _id: string; name: string; code: string; buildingId: string }>;
  disciplines?: Array<{ _id: string; name: string; code: string; floorId: string }>;
}>();

const emit = defineEmits<{
  (e: "filter-change", filters: DrawingFilters): void;
}>();

const localFilters = ref<DrawingFilters>({
  buildingIds: [],
  floorIds: [],
  disciplineIds: [],
  levelCodes: [],
  disciplineCodes: [],
  fileType: ""
});

// Building options
const buildingOptions = computed(() => {
  return (props.buildings || []).map((b) => ({
    label: `${b.name} (${b.code})`,
    value: b._id
  }));
});

// Floor options (filtered by selected buildings if any)
const floorOptions = computed(() => {
  let floors = props.floors || [];

  // Filter floors by selected buildings
  if (localFilters.value.buildingIds.length > 0) {
    const selectedBuildingIds = localFilters.value.buildingIds.map((b) => b.value);
    floors = floors.filter((f) => selectedBuildingIds.includes(f.buildingId));
  }

  return floors.map((f) => ({
    label: `${f.name} (${f.code})`,
    value: f._id
  }));
});

// Discipline options (filtered by selected floors if any)
const disciplineOptions = computed(() => {
  let disciplines = props.disciplines || [];

  // Filter disciplines by selected floors
  if (localFilters.value.floorIds.length > 0) {
    const selectedFloorIds = localFilters.value.floorIds.map((f) => f.value);
    disciplines = disciplines.filter((d) => selectedFloorIds.includes(d.floorId));
  }

  return disciplines.map((d) => ({
    label: `${d.name} (${d.code})`,
    value: d._id
  }));
});

// Predefined level code options (common codes)
const levelCodeOptions = ref<FilterOption[]>([
  { label: "KG2 (Tầng hầm 2)", value: "KG2" },
  { label: "KG (Tầng hầm)", value: "KG" },
  { label: "EG (Tầng trệt)", value: "EG" },
  { label: "1OG (Tầng 1)", value: "1OG" },
  { label: "2OG (Tầng 2)", value: "2OG" },
  { label: "3OG (Tầng 3)", value: "3OG" },
  { label: "4OG (Tầng 4)", value: "4OG" },
  { label: "5OG (Tầng 5)", value: "5OG" },
  { label: "ZD (Mái)", value: "ZD" },
  { label: "DA (Tầng áp mái)", value: "DA" },
  { label: "ALL (Tất cả)", value: "ALL" }
]);

// Predefined discipline code options
const disciplineCodeOptions = ref<FilterOption[]>([
  { label: "ARC (Kiến trúc)", value: "ARC" },
  { label: "STR (Kết cấu)", value: "STR" },
  { label: "ELT (Điện)", value: "ELT" },
  { label: "HZG (Sưởi)", value: "HZG" },
  { label: "SAN (Vệ sinh)", value: "SAN" },
  { label: "RLT (Thông gió)", value: "RLT" },
  { label: "KLT (Điều hoà)", value: "KLT" },
  { label: "SPR (Chống cháy)", value: "SPR" },
  { label: "BRS (Chống cháy nước)", value: "BRS" },
  { label: "ELK (Điện yếu)", value: "ELK" },
  { label: "PLB (Ống nước)", value: "PLB" }
]);

const addLevelCodeTag = (tag: string) => {
  const option = { label: tag.toUpperCase(), value: tag.toUpperCase() };
  if (!levelCodeOptions.value.find((o) => o.value === option.value)) {
    levelCodeOptions.value.push(option);
  }
  localFilters.value.levelCodes.push(option);
  emitFilters();
};

const addDisciplineCodeTag = (tag: string) => {
  const option = { label: tag.toUpperCase(), value: tag.toUpperCase() };
  if (!disciplineCodeOptions.value.find((o) => o.value === option.value)) {
    disciplineCodeOptions.value.push(option);
  }
  localFilters.value.disciplineCodes.push(option);
  emitFilters();
};

const hasActiveFilters = computed(() => {
  return (
    localFilters.value.buildingIds.length > 0 ||
    localFilters.value.floorIds.length > 0 ||
    localFilters.value.disciplineIds.length > 0 ||
    localFilters.value.levelCodes.length > 0 ||
    localFilters.value.disciplineCodes.length > 0 ||
    localFilters.value.fileType !== ""
  );
});

const activeFiltersList = computed(() => {
  const list: Array<{ key: string; label: string }> = [];

  localFilters.value.buildingIds.forEach((b) => {
    list.push({ key: `building-${b.value}`, label: `Tòa: ${b.label}` });
  });

  localFilters.value.floorIds.forEach((f) => {
    list.push({ key: `floor-${f.value}`, label: `Tầng: ${f.label}` });
  });

  localFilters.value.disciplineIds.forEach((d) => {
    list.push({ key: `discipline-${d.value}`, label: `Bộ môn: ${d.label}` });
  });

  localFilters.value.levelCodes.forEach((l) => {
    list.push({ key: `levelCode-${l.value}`, label: `Mã tầng: ${l.label}` });
  });

  localFilters.value.disciplineCodes.forEach((d) => {
    list.push({ key: `disciplineCode-${d.value}`, label: `Mã BM: ${d.label}` });
  });

  if (localFilters.value.fileType) {
    const typeLabels: Record<string, string> = {
      "2d": "2D (PDF)",
      "3d": "3D (IFC)",
      "hybrid": "Hybrid"
    };
    list.push({
      key: "fileType",
      label: `Loại: ${typeLabels[localFilters.value.fileType] || localFilters.value.fileType}`
    });
  }

  return list;
});

const removeFilter = (key: string) => {
  if (key.startsWith("building-")) {
    const id = key.replace("building-", "");
    localFilters.value.buildingIds = localFilters.value.buildingIds.filter((b) => b.value !== id);
  } else if (key.startsWith("floor-")) {
    const id = key.replace("floor-", "");
    localFilters.value.floorIds = localFilters.value.floorIds.filter((f) => f.value !== id);
  } else if (key.startsWith("discipline-")) {
    const id = key.replace("discipline-", "");
    localFilters.value.disciplineIds = localFilters.value.disciplineIds.filter((d) => d.value !== id);
  } else if (key.startsWith("levelCode-")) {
    const code = key.replace("levelCode-", "");
    localFilters.value.levelCodes = localFilters.value.levelCodes.filter((l) => l.value !== code);
  } else if (key.startsWith("disciplineCode-")) {
    const code = key.replace("disciplineCode-", "");
    localFilters.value.disciplineCodes = localFilters.value.disciplineCodes.filter((d) => d.value !== code);
  } else if (key === "fileType") {
    localFilters.value.fileType = "";
  }

  emitFilters();
};

const clearAllFilters = () => {
  localFilters.value = {
    buildingIds: [],
    floorIds: [],
    disciplineIds: [],
    levelCodes: [],
    disciplineCodes: [],
    fileType: ""
  };
  emitFilters();
};

const emitFilters = () => {
  emit("filter-change", localFilters.value);
};

// Clear floor/discipline filters when building filter changes
watch(
  () => localFilters.value.buildingIds,
  (newVal, oldVal) => {
    if (newVal.length !== oldVal.length || !newVal.every((v, i) => v.value === oldVal[i]?.value)) {
      // Building selection changed, clear dependent filters
      localFilters.value.floorIds = [];
      localFilters.value.disciplineIds = [];
    }
  }
);

// Clear discipline filters when floor filter changes
watch(
  () => localFilters.value.floorIds,
  (newVal, oldVal) => {
    if (newVal.length !== oldVal.length || !newVal.every((v, i) => v.value === oldVal[i]?.value)) {
      // Floor selection changed, clear dependent filters
      localFilters.value.disciplineIds = [];
    }
  }
);
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
