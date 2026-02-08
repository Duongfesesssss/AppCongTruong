<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      @click.self="$emit('close')"
    >
      <div class="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <h3 class="text-base font-semibold text-slate-900 sm:text-lg">{{ title }}</h3>
          <button
            class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            @click="$emit('close')"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="mt-4">
          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  title: string;
}>();

defineEmits<{
  (e: "close"): void;
}>();
</script>
