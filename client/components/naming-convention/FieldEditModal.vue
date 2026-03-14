<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show && localField"
        class="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div class="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" style="max-height: 88dvh">
          <!-- Header -->
          <div class="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-6">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold text-slate-900">
                Cấu hình: {{ getFieldLabel(localField.type) }}
              </h3>
              <button type="button" class="rounded-full p-1 text-slate-400 hover:bg-slate-100" @click="emit('close')">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-5">
            <!-- Required toggle -->
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-semibold text-slate-800">Bắt buộc (Required)</label>
                <p class="text-xs text-slate-500 mt-0.5">Trường này phải có trong tên file</p>
              </div>
              <button
                type="button"
                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :class="localField.required ? 'bg-brand-600' : 'bg-slate-200'"
                role="switch"
                @click="localField.required = !localField.required"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="localField.required ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>

            <!-- Keywords section (only for fields that have a library) -->
            <div v-if="libraryFieldType">
              <div class="mb-3 flex items-center justify-between">
                <label class="text-sm font-semibold text-slate-800">
                  Keywords đang dùng
                  <span class="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">{{ localField.keywords.length }}</span>
                </label>
              </div>

              <!-- Selected keywords chips -->
              <div v-if="localField.keywords.length" class="mb-3 flex flex-wrap gap-1.5">
                <span
                  v-for="(kw, i) in localField.keywords"
                  :key="kw.code"
                  class="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800"
                >
                  <span class="font-mono font-bold">{{ kw.code }}</span>
                  <span class="text-brand-600">{{ kw.label.split('(')[0].trim() }}</span>
                  <button type="button" class="ml-0.5 rounded-full hover:text-rose-500" @click="removeKeyword(i)">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
              <p v-else class="mb-3 text-xs text-slate-400 italic">Chưa có keyword nào được chọn.</p>

              <!-- Library picker -->
              <div class="border-t border-slate-100 pt-4">
                <div class="mb-2 flex items-center justify-between">
                  <p class="text-xs font-semibold text-slate-700">Chọn từ kho từ khóa</p>
                  <input
                    v-model="librarySearch"
                    type="text"
                    class="input h-7 w-36 text-xs"
                    placeholder="Tìm kiếm..."
                  />
                </div>

                <div v-if="libraryLoading" class="flex items-center justify-center py-6">
                  <svg class="h-5 w-5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>

                <div v-else class="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="item in filteredLibrary"
                      :key="item._id"
                      type="button"
                      class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                      :class="isSelected(item.code)
                        ? 'border-brand-400 bg-brand-100 text-brand-800 cursor-default'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800'"
                      :disabled="isSelected(item.code)"
                      @click="addFromLibrary(item)"
                    >
                      <span class="font-mono font-bold">{{ item.code }}</span>
                      <span class="opacity-70">{{ item.label.split('(')[0].trim() }}</span>
                      <svg v-if="isSelected(item.code)" class="h-3 w-3 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    <p v-if="filteredLibrary.length === 0" class="py-2 px-1 text-xs text-slate-400">Không tìm thấy. Thêm mã mới bên dưới.</p>
                  </div>
                </div>

                <!-- Add new to library -->
                <div class="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3">
                  <p class="mb-2 text-xs font-semibold text-slate-600">Thêm mã mới vào kho:</p>
                  <div class="flex gap-2">
                    <input
                      v-model="newKwCode"
                      type="text"
                      class="input w-28 uppercase text-xs"
                      placeholder="Mã (VD: KT)"
                      maxlength="30"
                      @keydown.enter.prevent="addToLibrary"
                    />
                    <input
                      v-model="newKwLabel"
                      type="text"
                      class="input flex-1 text-xs"
                      placeholder="Nhãn (VD: Kiến trúc)"
                      maxlength="100"
                      @keydown.enter.prevent="addToLibrary"
                    />
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      :disabled="!newKwCode.trim() || !newKwLabel.trim() || addingToLibrary"
                      @click="addToLibrary"
                    >
                      <svg v-if="addingToLibrary" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      + Vào kho
                    </button>
                  </div>
                  <p v-if="addLibraryError" class="mt-1 text-xs text-rose-500">{{ addLibraryError }}</p>
                </div>
              </div>
            </div>

            <div v-else class="rounded-lg border border-dashed border-slate-200 py-4 text-center text-sm text-slate-400 italic">
              Trường này không cần cấu hình keywords.
            </div>
          </div>

          <!-- Footer -->
          <div class="shrink-0 flex justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
            <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="emit('close')">
              Hủy
            </button>
            <button type="button" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" @click="saveField">
              Lưu
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { NamingField } from "~/types/naming-convention";
import { useKeywordLibrary, namingFieldToLibraryField, type KeywordLibraryItem } from "~/composables/api/useKeywordLibrary";
import { useToast } from "~/composables/state/useToast";

const props = defineProps<{
  show: boolean;
  field: NamingField | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [field: NamingField];
}>();

const { getKeywords, addKeyword } = useKeywordLibrary();
const toast = useToast();

const localField = ref<NamingField | null>(null);
const libraryItems = ref<KeywordLibraryItem[]>([]);
const libraryLoading = ref(false);
const librarySearch = ref("");
const newKwCode = ref("");
const newKwLabel = ref("");
const addingToLibrary = ref(false);
const addLibraryError = ref("");

// Dùng field.label trực tiếp thay vì map từ type
const getFieldLabel = (type: string) => localField.value?.label || type;

const libraryFieldType = computed(() => {
  if (!localField.value) return null;
  return namingFieldToLibraryField[localField.value.type] ?? null;
});

const filteredLibrary = computed(() => {
  const q = librarySearch.value.trim().toUpperCase();
  if (!q) return libraryItems.value;
  return libraryItems.value.filter(
    (item) =>
      item.code.includes(q) ||
      item.label.toUpperCase().includes(q) ||
      item.aliases.some((a) => a.includes(q))
  );
});

const isSelected = (code: string) =>
  localField.value?.keywords.some((k) => k.code === code) ?? false;

const loadLibrary = async () => {
  if (!libraryFieldType.value) return;
  libraryLoading.value = true;
  try {
    libraryItems.value = await getKeywords(libraryFieldType.value);
  } catch {
    toast.push("Không thể tải kho từ khóa", "error");
  } finally {
    libraryLoading.value = false;
  }
};

const addFromLibrary = (item: KeywordLibraryItem) => {
  if (!localField.value || isSelected(item.code)) return;
  localField.value.keywords.push({ code: item.code, label: item.label, aliases: item.aliases });
};

const removeKeyword = (index: number) => {
  localField.value?.keywords.splice(index, 1);
};

const addToLibrary = async () => {
  if (!libraryFieldType.value || !newKwCode.value.trim() || !newKwLabel.value.trim()) return;
  addingToLibrary.value = true;
  addLibraryError.value = "";
  try {
    const created = await addKeyword({
      fieldType: libraryFieldType.value,
      code: newKwCode.value.trim().toUpperCase(),
      label: newKwLabel.value.trim()
    });
    libraryItems.value = [...libraryItems.value, created].sort((a, b) => a.code.localeCompare(b.code));
    if (!isSelected(created.code)) {
      localField.value?.keywords.push({ code: created.code, label: created.label, aliases: created.aliases });
    }
    newKwCode.value = "";
    newKwLabel.value = "";
    toast.push(`Đã thêm "${created.code}" vào kho từ khóa`, "success");
  } catch (err: any) {
    addLibraryError.value = err?.message || "Không thể thêm từ khóa";
  } finally {
    addingToLibrary.value = false;
  }
};

const saveField = () => {
  if (!localField.value) return;
  emit("save", localField.value);
  emit("close");
};

watch(
  () => props.field,
  (newField) => {
    if (newField) localField.value = JSON.parse(JSON.stringify(newField));
  },
  { immediate: true }
);

watch(
  () => props.show,
  async (val) => {
    if (val && props.field) {
      localField.value = JSON.parse(JSON.stringify(props.field));
      librarySearch.value = "";
      newKwCode.value = "";
      newKwLabel.value = "";
      addLibraryError.value = "";
      await loadLibrary();
    }
  }
);
</script>
