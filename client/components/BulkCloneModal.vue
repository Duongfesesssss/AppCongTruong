<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('cancel')"
      >
        <div class="w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
          <!-- Header -->
          <div class="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold text-slate-900 sm:text-lg">Nhân bản hàng loạt Pin</h3>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="px-4 py-4 sm:px-6 sm:py-5 space-y-4">
            <p class="text-sm text-slate-600 sm:text-base">
              Nhân bản sẽ tạo nhiều pin mới với cùng thông tin (Tên, Loại, Trạng thái, Ghi chú) nhưng không copy ảnh.
              Mỗi pin mới sẽ được tạo tại vị trí hiện tại với mã pin khác nhau.
            </p>

            <!-- Quantity Input -->
            <div class="space-y-2">
              <label for="clone-count" class="block text-sm font-medium text-slate-700">
                Số lượng pin cần nhân bản
              </label>
              <input
                id="clone-count"
                v-model.number="cloneCount"
                type="number"
                min="1"
                max="50"
                class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Nhập số lượng (1-50)"
              />
              <p class="text-xs text-slate-500">Tối đa: 50 pin cùng lúc</p>
            </div>

            <!-- Quick Presets -->
            <div class="space-y-2">
              <p class="text-sm font-medium text-slate-700">Hoặc chọn nhanh:</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="preset in presets"
                  :key="preset"
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                  :class="cloneCount === preset
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                  @click="cloneCount = preset"
                >
                  {{ preset }}
                </button>
              </div>
            </div>

            <!-- Warning for large counts -->
            <p v-if="cloneCount > 20" class="text-xs text-amber-600 flex items-start gap-1">
              <svg class="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Nhân bản số lượng lớn có thể mất vài giây. Vui lòng đợi!</span>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 border-t border-slate-100 px-4 py-3 sm:justify-end sm:px-6 sm:py-4">
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 sm:h-10 sm:flex-none sm:px-4"
              :disabled="processing"
              @click="emit('cancel')"
            >
              Huỷ
            </button>
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 sm:h-10 sm:flex-none sm:px-4"
              :disabled="!isValidCount || processing"
              @click="handleConfirm"
            >
              <svg v-if="processing" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>{{ processing ? 'Đang nhân bản...' : 'Nhân bản' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  show: boolean;
  processing?: boolean;
}>();

const emit = defineEmits<{
  (e: "confirm", count: number): void;
  (e: "cancel"): void;
}>();

const cloneCount = ref(5); // Default to 5
const presets = [1, 5, 10, 20, 50];

const isValidCount = computed(() => {
  return cloneCount.value >= 1 && cloneCount.value <= 50 && Number.isInteger(cloneCount.value);
});

const handleConfirm = () => {
  if (isValidCount.value) {
    emit('confirm', cloneCount.value);
  }
};
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
