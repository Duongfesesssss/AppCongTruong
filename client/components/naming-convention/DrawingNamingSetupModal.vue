<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div class="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" style="max-height: 92dvh">

          <!-- Header -->
          <div class="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold text-slate-900 sm:text-lg">
                  {{ isFirstTime ? "Định nghĩa quy tắc đặt tên" : "Chỉnh sửa quy tắc đặt tên" }}
                </h3>
                <p class="text-xs text-slate-500">
                  {{ isFirstTime ? "Gán nhãn cho từng phần. Các bản vẽ tiếp theo sẽ tự nhận diện theo quy tắc này." : "Xem lại và chỉnh sửa quy tắc đã lưu cho dự án." }}
                </p>
              </div>
              <button class="rounded-full p-1 text-slate-400 hover:bg-slate-100" type="button" @click="emit('close')">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-5">

            <!-- Loading -->
            <div v-if="isLoading" class="flex items-center justify-center py-16">
              <svg class="h-7 w-7 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>

            <template v-else>
              <!-- Step 1: Filename + delimiter -->
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tên file</p>
                <p class="break-all font-mono text-sm font-bold text-slate-800">{{ filename }}</p>
              </div>

              <!-- Delimiter selector -->
              <div>
                <label class="mb-2 block text-sm font-semibold text-slate-700">Ký tự phân cách <span class="font-normal text-slate-400">(delimiter)</span></label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="sep in separatorOptions"
                    :key="sep.value"
                    type="button"
                    class="rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold transition-colors"
                    :class="localSeparator === sep.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'"
                    @click="changeSeparator(sep.value)"
                  >
                    {{ sep.label }}
                  </button>
                  <input
                    v-model="customSeparator"
                    type="text"
                    class="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center font-mono text-sm focus:border-brand-400 focus:outline-none"
                    placeholder="Khác..."
                    maxlength="3"
                    @input="onCustomSepInput"
                  />
                </div>
              </div>

              <!-- Step 2: Segments preview as chips -->
              <div v-if="segments.length">
                <p class="mb-2 text-sm font-semibold text-slate-700">
                  Tên file được cắt thành <span class="text-brand-600">{{ segments.length }} phần</span>:
                </p>
                <div class="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-3">
                  <template v-for="(seg, idx) in segments" :key="idx">
                    <span class="rounded-lg border border-brand-300 bg-white px-3 py-1 font-mono text-sm font-bold text-brand-800 shadow-sm">
                      {{ seg }}
                    </span>
                    <span v-if="idx < segments.length - 1" class="text-xs font-bold text-slate-400">
                      {{ localSeparator === ' ' ? '␣' : localSeparator }}
                    </span>
                  </template>
                </div>
              </div>

              <!-- Step 3: Tag assignment table -->
              <div v-if="fieldAssignments.length">
                <div class="mb-3 flex items-center justify-between">
                  <p class="text-sm font-semibold text-slate-700">Gán nhãn cho từng phần</p>
                  <span class="text-xs text-slate-400">Nhãn không được thì chọn "Bỏ qua"</span>
                </div>

                <div class="space-y-2">
                  <div
                    v-for="(seg, idx) in fieldAssignments"
                    :key="idx"
                    class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <!-- Index -->
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {{ idx + 1 }}
                    </span>

                    <!-- Segment chip -->
                    <span class="w-28 shrink-0 truncate rounded-lg bg-brand-50 px-2 py-1.5 text-center font-mono text-sm font-bold text-brand-800">
                      {{ seg.value }}
                    </span>

                    <!-- Arrow -->
                    <svg class="h-4 w-4 shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>

                    <!-- Tag dropdown -->
                    <div class="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                      <select
                        v-model="seg.type"
                        class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                        @change="onTypeChange(seg)"
                      >
                        <option value="">— Bỏ qua —</option>
                        <optgroup label="Nhãn có sẵn">
                          <option v-for="scope in PREDEFINED_TAG_SCOPES" :key="scope.type" :value="scope.type">
                            {{ scope.label }}
                          </option>
                        </optgroup>
                      </select>

                      <!-- Custom label input (khi chọn "Tùy chỉnh") -->
                      <input
                        v-if="seg.type === 'custom'"
                        v-model="seg.label"
                        type="text"
                        class="w-32 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
                        placeholder="Tên nhãn..."
                        maxlength="50"
                      />
                    </div>

                    <!-- Required badge -->
                    <span
                      v-if="seg.type && seg.type !== 'custom' || (seg.type === 'custom' && seg.label)"
                      class="shrink-0 text-xs text-slate-400"
                    >Bắt buộc</span>
                    <button
                      v-if="seg.type && seg.type !== 'custom' || (seg.type === 'custom' && seg.label)"
                      type="button"
                      class="relative h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors"
                      :class="seg.required ? 'bg-brand-600' : 'bg-slate-200'"
                      @click="seg.required = !seg.required"
                    >
                      <span
                        class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                        :class="seg.required ? 'translate-x-4' : 'translate-x-0'"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Preview quy tắc đã cài -->
              <div v-if="conventionPreview" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p class="mb-1 text-xs font-semibold text-emerald-700">Quy tắc sẽ lưu cho dự án:</p>
                <code class="break-all text-sm font-mono font-bold text-emerald-900">{{ conventionPreview }}</code>
                <p class="mt-1.5 text-xs text-emerald-600">Các bản vẽ tiếp theo sẽ được tự động nhận diện theo quy tắc này.</p>
              </div>

              <!-- Info banner (chỉ hiện lần đầu) -->
              <div v-if="isFirstTime" class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                <svg class="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Chỉ cần setup 1 lần. Bạn có thể chỉnh sửa lại sau.</span>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="shrink-0 flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6">
            <button
              v-if="isFirstTime"
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
              @click="emit('skip')"
            >
              Bỏ qua
            </button>
            <div v-else />
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
                :disabled="isSaving || isLoading || !hasAnyAssignment"
                class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="saveAndConfirm"
              >
                <svg v-if="isSaving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ isSaving ? "Đang lưu..." : "Lưu quy tắc & Tiếp tục" }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { PREDEFINED_TAG_SCOPES } from "~/types/naming-convention";
import type { NamingField } from "~/types/naming-convention";
import { useNamingConvention } from "~/composables/api/useNamingConvention";
import { useToast } from "~/composables/state/useToast";

const props = defineProps<{
  show: boolean;
  projectId: string;
  filename: string;
  isFirstTime: boolean;
}>();

const emit = defineEmits<{
  close: [];
  skip: [];
  confirmed: [data: { separator: string; fields: NamingField[]; parsedValues: Record<string, string> }];
}>();

const { parseFilename, createOrUpdateNamingConvention, getNamingConvention } = useNamingConvention();
const toast = useToast();

const isLoading = ref(false);
const isSaving = ref(false);
const localSeparator = ref("-");
const customSeparator = ref("");
const segments = ref<string[]>([]);
const existingExampleFilename = ref("");

// Đếm ký tự phân cách trong filename và chọn loại xuất hiện nhiều nhất
const autoDetectSeparator = (name: string): string => {
  const nameWithoutExt = name.replace(/\.[^.]+$/, "");
  const counts: Record<string, number> = { "-": 0, "_": 0, ".": 0 };
  for (const ch of nameWithoutExt) {
    if (ch in counts) counts[ch]++;
  }
  const best = (Object.entries(counts) as [string, number][]).reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : "-";
};

type FieldAssignment = {
  value: string;
  type: string;
  label: string;
  required: boolean;
};

const fieldAssignments = ref<FieldAssignment[]>([]);

const separatorOptions = [
  { value: "-", label: "–" },
  { value: "_", label: "_" },
  { value: ".", label: "." },
  { value: " ", label: "Cách" }
];

const isPredefined = (type: string) =>
  PREDEFINED_TAG_SCOPES.some((s) => s.type === type);

const getLabelForType = (type: string) =>
  PREDEFINED_TAG_SCOPES.find((s) => s.type === type)?.label ?? type;

const hasAnyAssignment = computed(() =>
  fieldAssignments.value.some((f) => f.type && f.type !== "")
);

const conventionPreview = computed(() => {
  const assigned = fieldAssignments.value.filter((f) => f.type);
  if (!assigned.length) return "";
  return assigned
    .map((f) => {
      const displayLabel = f.type === "custom" ? (f.label || "?") : getLabelForType(f.type);
      return `[${displayLabel}]`;
    })
    .join(` ${localSeparator.value === " " ? "␣" : localSeparator.value} `);
});

const onTypeChange = (seg: FieldAssignment) => {
  if (seg.type && seg.type !== "custom" && isPredefined(seg.type)) {
    seg.label = getLabelForType(seg.type);
  } else if (seg.type !== "custom") {
    seg.label = seg.type;
  } else {
    seg.label = "";
  }
};

const onCustomSepInput = () => {
  if (customSeparator.value) changeSeparator(customSeparator.value);
};

const changeSeparator = async (sep: string) => {
  if (!sep || sep === localSeparator.value) return;
  localSeparator.value = sep;
  await loadSegments(sep);
};

const loadSegments = async (sep?: string) => {
  if (!props.projectId || !props.filename) return;
  isLoading.value = true;
  try {
    const result = await parseFilename(props.projectId, props.filename, sep);
    localSeparator.value = result.detectedSeparator;
    segments.value = result.segments;
    fieldAssignments.value = result.segments.map((val) => ({
      value: val,
      type: "",
      label: "",
      required: false
    }));
  } catch (err: any) {
    toast.push(err?.message || "Không thể phân tích tên file", "error");
  } finally {
    isLoading.value = false;
  }
};

// Load convention đã lưu và pre-fill khi chỉnh sửa
const loadExistingConvention = async () => {
  if (!props.projectId) return;
  isLoading.value = true;
  try {
    const convention = await getNamingConvention(props.projectId);
    existingExampleFilename.value = convention.exampleFilename || "";
    const sortedFields = [...(convention.fields ?? [])].sort((a, b) => a.order - b.order);

    // Ưu tiên: filename hiện tại → exampleFilename đã lưu → placeholder
    const filenameToUse = props.filename || convention.exampleFilename || "";

    // Auto-detect delimiter từ filename trước (cập nhật ngay khi đang load)
    if (filenameToUse) localSeparator.value = autoDetectSeparator(filenameToUse);
    const savedSep = convention.separator || localSeparator.value;

    if (filenameToUse) {
      // Parse filename để lấy segments thực tế
      const result = await parseFilename(props.projectId, filenameToUse, savedSep);
      // Dùng separator server detect được (chính xác nhất)
      localSeparator.value = result.detectedSeparator;
      segments.value = result.segments;
      // Map từng segment sang field đã lưu theo thứ tự order
      fieldAssignments.value = result.segments.map((val, idx) => {
        const saved = sortedFields[idx];
        return {
          value: val,
          type: saved?.type || "",
          label: saved?.label || "",
          required: saved?.required ?? false
        };
      });
    } else {
      // Không có filename nào → hiện danh sách field đã lưu với placeholder value
      segments.value = sortedFields.map((_, i) => `Trường ${i + 1}`);
      fieldAssignments.value = sortedFields.map((f) => ({
        value: `Trường ${f.order + 1}`,
        type: f.type,
        label: f.label || getLabelForType(f.type),
        required: f.required
      }));
    }
  } catch {
    await loadSegments();
  } finally {
    isLoading.value = false;
  }
};

const saveAndConfirm = async () => {
  const assigned = fieldAssignments.value.filter((f) => f.type && f.type !== "");
  if (!assigned.length) return;

  isSaving.value = true;
  try {
    const fields: NamingField[] = fieldAssignments.value
      .filter((f) => f.type && f.type !== "")
      .map((f, idx) => {
        const effectiveType = f.type === "custom" ? (f.label || "custom") : f.type;
        const effectiveLabel = f.type === "custom" ? (f.label || "Tùy chỉnh") : getLabelForType(f.type);
        return {
          type: effectiveType,
          label: effectiveLabel,
          order: idx,
          enabled: true,
          required: f.required,
          keywords: []
        };
      });

    await createOrUpdateNamingConvention({
      projectId: props.projectId,
      separator: localSeparator.value,
      fields,
      // Lưu tên file làm ví dụ nếu chưa có (cả lần đầu lẫn khi chỉnh sửa)
      ...(props.filename && !existingExampleFilename.value ? { exampleFilename: props.filename } : {})
    });

    toast.push("Đã lưu quy tắc đặt tên bản vẽ", "success");

    // Build parsedValues để form tự điền
    const parsedValues: Record<string, string> = {};
    fieldAssignments.value.forEach((f) => {
      if (!f.type || f.type === "") return;
      const key = f.type === "custom" ? (f.label || "custom") : f.type;
      parsedValues[key] = f.value;
    });

    emit("confirmed", { separator: localSeparator.value, fields, parsedValues });
  } catch (err: any) {
    toast.push(err?.message || "Không thể lưu quy tắc đặt tên", "error");
  } finally {
    isSaving.value = false;
  }
};

// immediate: true vì component được tạo bởi v-if khi show=true
// nên watch không có transition false→true, phải fire ngay khi mount
watch(
  () => props.show,
  (val) => {
    if (val) {
      customSeparator.value = "";
      existingExampleFilename.value = "";
      // Auto-detect delimiter ngay từ filename trước khi gọi server
      if (props.filename) localSeparator.value = autoDetectSeparator(props.filename);
      if (props.isFirstTime) {
        void loadSegments();
      } else {
        void loadExistingConvention();
      }
    }
  },
  { immediate: true }
);
</script>
