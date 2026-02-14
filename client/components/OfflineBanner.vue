<template>
  <Transition name="offline-banner">
    <div
      v-if="showBanner"
      class="border-b px-3 py-2 text-xs sm:px-4 sm:text-sm"
      :class="bannerClass"
    >
      <div class="mx-auto flex max-w-7xl items-center gap-2">
        <span class="font-semibold">{{ title }}</span>
        <span class="flex-1 truncate">{{ description }}</span>
        <button
          v-if="isOnline && pendingCount > 0 && !isSyncing"
          type="button"
          class="rounded border border-current px-2 py-0.5 text-[11px] font-medium hover:bg-white/20"
          @click="handleSync"
        >
          Dong bo ngay
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useOfflineSync } from "~/composables/state/useOfflineSync";

const { isOnline, pendingCount, isSyncing, lastSyncError, refreshPendingCount, syncNow } =
  useOfflineSync();

const showBanner = computed(
  () =>
    !isOnline.value ||
    isSyncing.value ||
    pendingCount.value > 0 ||
    (!!lastSyncError.value && !isSyncing.value)
);

const title = computed(() => {
  if (!isOnline.value) return "Offline";
  if (isSyncing.value) return "Dang dong bo";
  if (lastSyncError.value) return "Dong bo tam dung";
  if (pendingCount.value > 0) return "Cho dong bo";
  return "";
});

const description = computed(() => {
  if (!isOnline.value) {
    return `Khong co mang. ${pendingCount.value} thao tac se duoc luu tam.`;
  }
  if (isSyncing.value) {
    return `Dang dong bo ${pendingCount.value} thao tac...`;
  }
  if (lastSyncError.value) {
    return lastSyncError.value;
  }
  if (pendingCount.value > 0) {
    return `${pendingCount.value} thao tac dang cho dong bo.`;
  }
  return "";
});

const bannerClass = computed(() => {
  if (!isOnline.value) return "border-amber-300 bg-amber-100 text-amber-900";
  if (lastSyncError.value) return "border-rose-300 bg-rose-100 text-rose-900";
  return "border-blue-300 bg-blue-100 text-blue-900";
});

const handleSync = async () => {
  await syncNow();
  await refreshPendingCount();
};

onMounted(() => {
  refreshPendingCount().catch(() => undefined);
});
</script>

<style scoped>
.offline-banner-enter-active,
.offline-banner-leave-active {
  transition: all 0.2s ease;
}
.offline-banner-enter-from,
.offline-banner-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
