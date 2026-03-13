<template>
  <div class="min-h-screen bg-slate-100">
    <OfflineBanner />
    <!-- Mobile header with sidebar toggle -->
    <header class="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <button
        class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        @click="sidebarOpen = true"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Cây dự án
      </button>
      <div>
        <p class="text-xs uppercase tracking-widest text-slate-400">Construction</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100"
          title="Workspace Pin"
          @click="pinPanel.open.value = true"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
        <NotificationBell />
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
          title="Mở chat"
          @click="chatOpen = true"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z"
            />
          </svg>
        </button>
        <UserBadge />
      </div>
    </header>

    <!-- Mobile sidebar overlay -->
    <Teleport to="body">
      <Transition name="sidebar">
        <div v-if="sidebarOpen" class="fixed inset-0 z-50 flex lg:hidden">
          <div class="absolute inset-0 bg-black/40" @click="sidebarOpen = false"></div>
          <div class="relative z-10 w-[300px] max-w-[85vw] shadow-xl">
            <AppSidebar @navigate="sidebarOpen = false" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="flex">
      <!-- Desktop sidebar -->
      <div
        class="relative hidden lg:block lg:shrink-0"
        :style="{ width: sidebarWidth + 'px' }"
      >
        <div class="sticky top-0 h-screen overflow-y-auto">
          <AppSidebar />
        </div>
        <!-- Resize handle -->
        <div
          class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-400/40 active:bg-brand-400/60 transition-colors"
          @mousedown.prevent="startResize"
        />
      </div>

      <!-- Main content -->
      <div class="flex min-h-screen min-w-0 flex-1 flex-col">
        <!-- Desktop header -->
        <header class="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:flex">
          <div>
            <p class="text-xs uppercase tracking-widest text-slate-400">Construction</p>
            <h1 class="text-lg font-semibold text-slate-900">Bảng Điều Khiển</h1>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-100 transition-colors"
              @click="pinPanel.open.value = true"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Workspace Pin
            </button>
            <NotificationBell />
            <button
              class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
              title="Mở chat"
              @click="chatOpen = true"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z"
                />
              </svg>
            </button>
            <UserBadge />
          </div>
        </header>
        <main class="flex-1 p-3 sm:p-4 lg:p-6">
          <slot />
        </main>
      </div>
    </div>

    <WorkspaceChatPanel :show="chatOpen" @close="chatOpen = false" />
    <WorkspacePinPanel />
    <ToastList />
  </div>
</template>

<script setup lang="ts">
import { useRealtime } from "~/composables/state/useRealtime";
import { useChatPanel } from "~/composables/state/useChatPanel";
import { usePinPanel } from "~/composables/state/usePinPanel";

const realtime = useRealtime();
const { open: chatOpen } = useChatPanel();
const pinPanel = usePinPanel();
const sidebarOpen = ref(false);

const SIDEBAR_WIDTH_KEY = "sidebar-width-v1";
const sidebarWidth = ref(280);

onMounted(() => {
  const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  if (saved) {
    const n = parseInt(saved, 10);
    if (n >= 200 && n <= 600) sidebarWidth.value = n;
  }
});

const startResize = (e: MouseEvent) => {
  const startX = e.clientX;
  const startWidth = sidebarWidth.value;

  const onMove = (ev: MouseEvent) => {
    const next = startWidth + ev.clientX - startX;
    sidebarWidth.value = Math.min(600, Math.max(200, next));
  };

  const onUp = () => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth.value));
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
};

// Đóng sidebar khi chuyển route
const route = useRoute();
const syncSidebarStateByRoute = (nextPath: string, prevPath?: string) => {
  if (!process.client) return;

  if (window.innerWidth >= 1024) {
    sidebarOpen.value = false;
    return;
  }

  if (nextPath === "/" && (!prevPath || prevPath !== "/")) {
    sidebarOpen.value = true;
    return;
  }

  if (nextPath !== "/") {
    sidebarOpen.value = false;
  }
};

watch(
  () => route.path,
  (nextPath, prevPath) => {
    syncSidebarStateByRoute(nextPath, prevPath);
  },
  { immediate: true }
);

onMounted(() => {
  realtime.init();
});
</script>

<style>
.sidebar-enter-active,
.sidebar-leave-active {
  transition: opacity 0.2s ease;
}
.sidebar-enter-active > div:last-child,
.sidebar-leave-active > div:last-child {
  transition: transform 0.25s ease;
}
.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
}
.sidebar-enter-from > div:last-child,
.sidebar-leave-to > div:last-child {
  transform: translateX(-100%);
}
</style>
