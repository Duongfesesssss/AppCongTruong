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
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <svg class="h-5 w-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold text-slate-900 sm:text-lg">{{ title }}</h3>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="px-4 py-4 sm:px-6 sm:py-5">
            <p class="text-sm text-slate-600 sm:text-base">{{ message }}</p>
            <p v-if="danger" class="mt-2 text-xs text-rose-600 sm:text-sm">
              ⚠️ Hành động này không thể hoàn tác!
            </p>
          </div>

          <!-- Actions (mobile optimized with large tap targets) -->
          <div class="flex gap-2 border-t border-slate-100 px-4 py-3 sm:justify-end sm:px-6 sm:py-4">
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 sm:h-10 sm:flex-none sm:px-4"
              @click="emit('cancel')"
            >
              Huỷ
            </button>
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold text-white sm:h-10 sm:flex-none sm:px-4"
              :class="danger ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' : 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800'"
              @click="emit('confirm')"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();
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
