<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div class="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" style="max-height: 90dvh">
          <!-- Header -->
          <div class="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-slate-900 sm:text-lg">Cấu hình bản vẽ</h3>
                <p class="truncate text-xs text-slate-500">{{ projectName || "Khai báo tòa nhà và tầng cho project" }}</p>
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

          <!-- Scrollable body -->
          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div v-if="loading" class="flex items-center justify-center py-12">
              <svg class="h-6 w-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>

            <div v-else class="space-y-6">
              <!-- Buildings section -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="text-sm font-semibold text-slate-800">Tòa nhà (Building)</h4>
                  <span class="text-xs text-slate-400">{{ buildings.length }} mục</span>
                </div>
                <p class="mb-3 text-xs text-slate-500">Mã tòa nhà dùng trong tên bản vẽ, ví dụ: B01, A, T1</p>

                <!-- Add building form -->
                <div class="mb-3 flex gap-2">
                  <input
                    v-model="newBuilding.code"
                    type="text"
                    class="input w-28 uppercase"
                    placeholder="Mã (B01)"
                    maxlength="20"
                    @keydown.enter.prevent="addBuilding"
                  />
                  <input
                    v-model="newBuilding.name"
                    type="text"
                    class="input min-w-0 flex-1"
                    placeholder="Tên hiển thị (không bắt buộc)"
                    maxlength="60"
                    @keydown.enter.prevent="addBuilding"
                  />
                  <button
                    type="button"
                    class="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!newBuilding.code.trim()"
                    @click="addBuilding"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm
                  </button>
                </div>

                <!-- Building list -->
                <div v-if="buildings.length" class="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  <div
                    v-for="(b, i) in buildings"
                    :key="i"
                    class="flex items-center gap-3 px-3 py-2"
                  >
                    <span class="w-24 shrink-0 rounded bg-slate-100 px-2 py-0.5 text-center font-mono text-xs font-semibold text-slate-700 uppercase">{{ b.code }}</span>
                    <span class="min-w-0 flex-1 truncate text-sm text-slate-600">{{ b.name || "—" }}</span>
                    <button
                      type="button"
                      class="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      @click="removeBuilding(i)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p v-else class="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">
                  Chưa có tòa nhà nào. Thêm mã bên trên.
                </p>
              </div>

              <div class="border-t border-slate-100" />

              <!-- Levels section -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="text-sm font-semibold text-slate-800">Tầng (Level)</h4>
                  <span class="text-xs text-slate-400">{{ levels.length }} mục</span>
                </div>
                <p class="mb-3 text-xs text-slate-500">Mã tầng dùng trong tên bản vẽ, ví dụ: EG, 1OG, KG</p>

                <!-- Quick add defaults -->
                <div class="mb-2 flex flex-wrap gap-1">
                  <span class="text-xs text-slate-400">Mặc định:</span>
                  <button
                    v-for="opt in DEFAULT_LEVEL_OPTIONS"
                    :key="opt.code"
                    type="button"
                    class="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="levels.some(l => l.code === opt.code)"
                    @click="addLevelPreset(opt)"
                  >
                    {{ opt.code }}
                  </button>
                </div>

                <!-- Add level form -->
                <div class="mb-3 flex gap-2">
                  <input
                    v-model="newLevel.code"
                    type="text"
                    class="input w-28 uppercase"
                    placeholder="Mã (EG)"
                    maxlength="20"
                    @keydown.enter.prevent="addLevel"
                  />
                  <input
                    v-model="newLevel.name"
                    type="text"
                    class="input min-w-0 flex-1"
                    placeholder="Tên hiển thị (không bắt buộc)"
                    maxlength="60"
                    @keydown.enter.prevent="addLevel"
                  />
                  <button
                    type="button"
                    class="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!newLevel.code.trim()"
                    @click="addLevel"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm
                  </button>
                </div>

                <!-- Level list -->
                <div v-if="levels.length" class="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  <div
                    v-for="(l, i) in levels"
                    :key="i"
                    class="flex items-center gap-3 px-3 py-2"
                  >
                    <span class="w-24 shrink-0 rounded bg-slate-100 px-2 py-0.5 text-center font-mono text-xs font-semibold text-slate-700 uppercase">{{ l.code }}</span>
                    <span class="min-w-0 flex-1 truncate text-sm text-slate-600">{{ l.name || "—" }}</span>
                    <button
                      type="button"
                      class="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      @click="removeLevel(i)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p v-else class="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">
                  Chưa có tầng nào. Thêm mã hoặc chọn từ mặc định bên trên.
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6">
            <p v-if="errorMsg" class="min-w-0 flex-1 truncate text-xs text-rose-600">{{ errorMsg }}</p>
            <div v-else class="flex-1" />
            <div class="flex shrink-0 gap-2">
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
                :disabled="saving || loading"
                @click="save"
              >
                <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ saving ? "Đang lưu..." : "Lưu cấu hình" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";
import { DEFAULT_LEVEL_OPTIONS } from "~/constants/drawing-meta";

type ConfigItem = { code: string; name?: string };

type DrawingMetaConfig = {
  buildings: ConfigItem[];
  levels: ConfigItem[];
};

const props = defineProps<{
  show: boolean;
  projectId: string;
  projectName?: string;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
}>();

const api = useApi();
const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const errorMsg = ref("");

const buildings = ref<ConfigItem[]>([]);
const levels = ref<ConfigItem[]>([]);

const newBuilding = ref({ code: "", name: "" });
const newLevel = ref({ code: "", name: "" });

const fetchConfig = async () => {
  if (!props.projectId) return;
  loading.value = true;
  errorMsg.value = "";
  try {
    const data = await api.get<DrawingMetaConfig>(`/projects/${props.projectId}/drawing-config`);
    buildings.value = (data?.buildings ?? []).map((b) => ({ code: b.code, name: b.name }));
    levels.value = (data?.levels ?? []).map((l) => ({ code: l.code, name: l.name }));
  } catch {
    errorMsg.value = "Không thể tải cấu hình bản vẽ";
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.show,
  (val) => {
    if (val) {
      errorMsg.value = "";
      newBuilding.value = { code: "", name: "" };
      newLevel.value = { code: "", name: "" };
      void fetchConfig();
    }
  }
);

const addBuilding = () => {
  const code = newBuilding.value.code.trim().toUpperCase();
  if (!code) return;
  if (buildings.value.some((b) => b.code === code)) {
    errorMsg.value = `Mã "${code}" đã tồn tại`;
    return;
  }
  buildings.value.push({ code, name: newBuilding.value.name.trim() || undefined });
  newBuilding.value = { code: "", name: "" };
  errorMsg.value = "";
};

const removeBuilding = (i: number) => {
  buildings.value.splice(i, 1);
};

const addLevel = () => {
  const code = newLevel.value.code.trim().toUpperCase();
  if (!code) return;
  if (levels.value.some((l) => l.code === code)) {
    errorMsg.value = `Mã "${code}" đã tồn tại`;
    return;
  }
  levels.value.push({ code, name: newLevel.value.name.trim() || undefined });
  newLevel.value = { code: "", name: "" };
  errorMsg.value = "";
};

const addLevelPreset = (opt: { code: string; label: string }) => {
  if (levels.value.some((l) => l.code === opt.code)) return;
  levels.value.push({ code: opt.code, name: opt.label });
};

const removeLevel = (i: number) => {
  levels.value.splice(i, 1);
};

const save = async () => {
  saving.value = true;
  errorMsg.value = "";
  try {
    await api.patch(`/projects/${props.projectId}/drawing-config`, {
      buildings: buildings.value.map((b) => ({ code: b.code, ...(b.name ? { name: b.name } : {}) })),
      levels: levels.value.map((l) => ({ code: l.code, ...(l.name ? { name: l.name } : {}) }))
    });
    toast.push("Đã lưu cấu hình bản vẽ", "success");
    emit("updated");
    emit("close");
  } catch (err) {
    errorMsg.value = (err as Error).message || "Không thể lưu cấu hình";
  } finally {
    saving.value = false;
  }
};
</script>
