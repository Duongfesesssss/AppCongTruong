<template>
  <div class="min-h-screen bg-slate-100">
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
      <UserBadge />
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
      <div class="hidden lg:block lg:w-[280px] lg:shrink-0">
        <div class="sticky top-0 h-screen overflow-y-auto">
          <AppSidebar />
        </div>
      </div>

      <!-- Main content -->
      <div class="flex min-h-screen min-w-0 flex-1 flex-col">
        <!-- Desktop header -->
        <header class="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:flex">
          <div>
            <p class="text-xs uppercase tracking-widest text-slate-400">Construction</p>
            <h1 class="text-lg font-semibold text-slate-900">Bảng Điều Khiển</h1>
          </div>
          <UserBadge />
        </header>
        <main class="flex-1 p-3 sm:p-4 lg:p-6">
          <slot />
        </main>
      </div>
    </div>

    <ToastList />
  </div>
</template>

<script setup>
const sidebarOpen = ref(false);

// Đóng sidebar khi chuyển route
const route = useRoute();
watch(() => route.fullPath, () => {
  sidebarOpen.value = false;
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
