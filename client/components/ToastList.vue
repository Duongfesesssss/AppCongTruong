<template>
  <div class="fixed right-6 top-6 z-50 flex w-80 flex-col gap-3">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="rounded-xl border px-4 py-3 text-sm shadow-sm"
      :class="toastClass(toast.type)"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from "~/composables/state/useToast";

const { toasts } = useToast();

const toastClass = (type: "info" | "success" | "error") => {
  if (type === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "error") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-white text-slate-700";
};
</script>
