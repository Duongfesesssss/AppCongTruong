<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Top Header -->
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div class="flex h-16 items-center justify-between px-4 lg:px-6">
        <div class="flex items-center gap-4">
          <button class="lg:hidden" @click="toggleSidebar">
            <i class="pi pi-bars text-xl text-slate-600"></i>
          </button>
          <h1 class="text-xl font-bold text-brand-700">CMS Admin</h1>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <i class="pi pi-home mr-1"></i>
            Trang chủ
          </NuxtLink>
          <div class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Avatar
              :label="userInitial"
              class="bg-brand-600 text-white"
              shape="circle"
              size="normal"
            />
            <div class="hidden text-sm sm:block">
              <div class="font-medium text-slate-900">{{ user?.name || "User" }}</div>
              <div class="text-xs text-slate-500">{{ user?.email }}</div>
            </div>
          </div>
          <button
            class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
            @click="handleLogout"
          >
            <i class="pi pi-sign-out mr-1"></i>
            Đăng xuất
          </button>
        </div>
      </div>
    </header>

    <div class="flex">
      <!-- Sidebar Navigation -->
      <aside
        class="fixed inset-y-0 left-0 top-16 z-30 w-64 transform border-r border-slate-200 bg-white shadow-lg transition-transform duration-300 lg:static lg:translate-x-0"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <nav class="h-full overflow-y-auto p-4">
          <ul class="space-y-2">
            <li>
              <NuxtLink
                to="/cms"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-brand-50 hover:text-brand-700"
                :class="isActive('/cms') ? 'bg-brand-100 text-brand-700' : 'text-slate-700'"
                @click="closeSidebarOnMobile"
              >
                <i class="pi pi-th-large text-lg"></i>
                <span>Dashboard</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/cms/user"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-brand-50 hover:text-brand-700"
                :class="isActive('/cms/user') ? 'bg-brand-100 text-brand-700' : 'text-slate-700'"
                @click="closeSidebarOnMobile"
              >
                <i class="pi pi-user text-lg"></i>
                <span>Quản lý tài khoản</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/cms/entries"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-brand-50 hover:text-brand-700"
                :class="isActive('/cms/entries') ? 'bg-brand-100 text-brand-700' : 'text-slate-700'"
                @click="closeSidebarOnMobile"
              >
                <i class="pi pi-file-edit text-lg"></i>
                <span>Quản lý nội dung</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/cms/tagname"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-brand-50 hover:text-brand-700"
                :class="isActive('/cms/tagname') ? 'bg-brand-100 text-brand-700' : 'text-slate-700'"
                @click="closeSidebarOnMobile"
              >
                <i class="pi pi-tags text-lg"></i>
                <span>Quản lý tag name</span>
              </NuxtLink>
            </li>
          </ul>

          <div class="mt-6 border-t border-slate-200 pt-4">
            <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hệ thống
            </p>
            <ul class="space-y-2">
              <li>
                <button
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  @click="showHelp"
                >
                  <i class="pi pi-question-circle text-lg"></i>
                  <span>Trợ giúp</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- Overlay for mobile -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 top-16 z-20 bg-black/20 lg:hidden"
        @click="closeSidebar"
      ></div>

      <!-- Main Content -->
      <main class="flex-1 p-4 lg:p-6">
        <slot />
      </main>
    </div>

    <!-- Toast for notifications -->
    <PrimeToast position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/state/useAuth";
import { useToast as usePrimeToast } from "primevue/usetoast";

const auth = useAuth();
const router = useRouter();
const route = useRoute();
const primeToast = usePrimeToast();

const sidebarOpen = ref(false);
const user = computed(() => auth.user.value);

const userInitial = computed(() => {
  const name = user.value?.name || "U";
  return name.charAt(0).toUpperCase();
});

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const closeSidebar = () => {
  sidebarOpen.value = false;
};

const closeSidebarOnMobile = () => {
  if (window.innerWidth < 1024) {
    closeSidebar();
  }
};

const isActive = (path: string) => {
  if (path === "/cms") {
    return route.path === "/cms";
  }
  return route.path.startsWith(path);
};

const handleLogout = async () => {
  try {
    await auth.logout();
    router.push("/login");
  } catch (err) {
    primeToast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Không thể đăng xuất",
      life: 3000
    });
  }
};

const showHelp = () => {
  primeToast.add({
    severity: "info",
    summary: "Trợ giúp",
    detail: "Liên hệ quản trị viên để được hỗ trợ",
    life: 3000
  });
};
</script>
