<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('cancel')"
      >
        <div class="w-full max-w-lg rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
          <!-- Header -->
          <div class="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold text-slate-900 sm:text-lg">Tải ảnh lên</h3>
                <p v-if="selectedFiles.length > 0" class="text-xs text-slate-500">
                  {{ selectedFiles.length }} ảnh đã chọn
                </p>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="px-4 py-4 sm:px-6 sm:py-5">
            <!-- File picker -->
            <div class="mb-4">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Chọn ảnh</label>
              <label class="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center hover:border-brand-500 hover:bg-brand-50">
                <svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-slate-700">Click để chọn ảnh</p>
                  <p class="text-xs text-slate-500">hoặc kéo thả vào đây</p>
                </div>
                <input
                  ref="fileInputRef"
                  type="file"
                  class="hidden"
                  accept="image/*"
                  multiple
                  @change="handleFileSelect"
                />
              </label>

              <!-- Selected files list -->
              <div v-if="selectedFiles.length > 0" class="mt-3 space-y-2">
                <div
                  v-for="(file, index) in selectedFiles"
                  :key="index"
                  class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="flex-1 truncate text-xs text-slate-700">{{ file.name }}</span>
                  <button
                    type="button"
                    class="text-slate-400 hover:text-rose-600"
                    @click="removeFile(index)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Name field -->
            <div class="mt-4">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">
                {{ selectedFiles.length > 1 ? "Tên ảnh (prefix)" : "Tên ảnh" }}
                <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="nameValue"
                type="text"
                :placeholder="selectedFiles.length > 1 ? 'Vd: Ảnh van chống cháy (→ ...1, ...2, ...3)' : 'Vd: Ảnh van chống cháy'"
                class="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10 sm:text-sm"
              />
            </div>

            <!-- Description field -->
            <div class="mt-3">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Mô tả</label>
              <textarea
                v-model="descriptionValue"
                placeholder="Vd: Chụp từ góc phía bắc của phòng kỹ thuật..."
                rows="2"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              ></textarea>
            </div>

            <!-- Location field -->
            <div class="mt-3">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Phòng/Khu vực</label>
              <input
                v-model="locationValue"
                type="text"
                placeholder="Vd: Phòng kỹ thuật, Tầng 5..."
                class="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10 sm:text-sm"
              />
            </div>

            <!-- Category field -->
            <div class="mt-3">
              <label class="block text-xs font-medium text-slate-700 sm:text-sm">Hạng mục</label>
              <select
                v-model="categoryValue"
                class="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-10"
              >
                <option value="">-- Chọn hạng mục --</option>
                <option value="fire_protection">Chống cháy</option>
                <option value="quality">Chất lượng</option>
                <option value="safety">An toàn</option>
                <option value="progress">Tiến độ</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <p class="mt-3 text-xs text-slate-500">
              💡 Thông tin này sẽ áp dụng cho tất cả {{ selectedFiles.length }} ảnh
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 border-t border-slate-100 px-4 py-3 sm:justify-end sm:px-6 sm:py-4">
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 sm:h-10 sm:flex-none sm:px-4"
              @click="handleCancel"
            >
              Huỷ
            </button>
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 active:bg-brand-800 sm:h-10 sm:flex-none sm:px-4"
              :disabled="!canSubmit"
              :class="{ 'opacity-50 cursor-not-allowed': !canSubmit }"
              @click="handleSubmit"
            >
              Tải lên
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "upload", data: {
    files: File[];
    name: string;
    description: string;
    location: string;
    category: string;
  }): void;
  (e: "cancel"): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const nameValue = ref("");
const descriptionValue = ref("");
const locationValue = ref("");
const categoryValue = ref("");

const canSubmit = computed(() => {
  return selectedFiles.value.length > 0 && nameValue.value.trim().length > 0;
});

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    selectedFiles.value = Array.from(input.files);
  }
};

const removeFile = (index: number) => {
  selectedFiles.value = selectedFiles.value.filter((_, i) => i !== index);
};

const handleSubmit = () => {
  if (!canSubmit.value) return;

  emit("upload", {
    files: selectedFiles.value,
    name: nameValue.value.trim(),
    description: descriptionValue.value.trim(),
    location: locationValue.value.trim(),
    category: categoryValue.value
  });

  // Reset
  selectedFiles.value = [];
  nameValue.value = "";
  descriptionValue.value = "";
  locationValue.value = "";
  categoryValue.value = "";
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
};

const handleCancel = () => {
  // Reset
  selectedFiles.value = [];
  nameValue.value = "";
  descriptionValue.value = "";
  locationValue.value = "";
  categoryValue.value = "";
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }

  emit("cancel");
};

// Reset when modal closes
watch(() => props.show, (newVal) => {
  if (!newVal) {
    selectedFiles.value = [];
    nameValue.value = "";
    descriptionValue.value = "";
    locationValue.value = "";
    categoryValue.value = "";
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  }
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div {
  transform: translateY(100%);
  opacity: 0;
}
.modal-leave-to > div {
  transform: translateY(100%);
  opacity: 0;
}

@media (min-width: 640px) {
  .modal-enter-from > div,
  .modal-leave-to > div {
    transform: translateY(0) scale(0.95);
  }
}
</style>
