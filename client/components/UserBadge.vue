<template>
  <div class="flex items-center gap-2 sm:gap-3">
    <div class="text-right">
      <p class="text-xs font-medium text-slate-900 sm:text-sm">{{ auth.user?.name || "..." }}</p>
      <p class="hidden text-xs text-slate-500 sm:block">{{ auth.user?.email || "" }}</p>
    </div>
    <button
      v-if="auth.user"
      class="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 sm:px-3 sm:py-1 sm:text-xs"
      @click="handleLogout"
    >
      <span class="hidden sm:inline">Đăng xuất</span>
      <svg class="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/state/useAuth";
import { useToast } from "~/composables/state/useToast";

const auth = useAuth();
const toast = useToast();

const handleLogout = async () => {
  await auth.logout();
  toast.push("Đã đăng xuất", "success");
  navigateTo("/login");
};
</script>
