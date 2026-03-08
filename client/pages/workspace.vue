<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header Section -->
    <section class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900">Workspace Quản lý Pin</h1>
          <p class="mt-1 text-xs sm:text-sm text-slate-500">Quản lý tất cả Pin/Task trong dự án</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-brand-100 px-3 py-1 text-xs sm:text-sm font-semibold text-brand-700">
            {{ filteredPins.length }} Pin
          </span>
        </div>
      </div>
    </section>

    <!-- Filters Section -->
    <section class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <h2 class="text-base sm:text-lg font-semibold text-slate-900">Bộ lọc</h2>
        <button
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          class="ml-auto text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          Xóa bộ lọc
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Project Filter -->
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Dự án</label>
          <select v-model="filters.projectId" class="input text-sm">
            <option value="">Tất cả dự án</option>
            <option v-for="project in userProjects" :key="project._id" :value="project._id">
              {{ project.name }}
            </option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</label>
          <select v-model="filters.status" class="input text-sm">
            <option value="">Tất cả trạng thái</option>
            <option value="instruction">Hướng dẫn cho người vẽ</option>
            <option value="rfi">Yêu cầu thêm thông tin (RFI)</option>
            <option value="resolved">Đã hoàn thành</option>
            <option value="approved">Đã được QA kiểm soát</option>
            <option value="open">Mở</option>
            <option value="in_progress">Đang làm</option>
            <option value="blocked">Bị chặn</option>
            <option value="done">Xong</option>
          </select>
        </div>

        <!-- Category Filter -->
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Loại</label>
          <select v-model="filters.category" class="input text-sm">
            <option value="">Tất cả loại</option>
            <option value="quality">Chất lượng</option>
            <option value="safety">An toàn</option>
            <option value="progress">Tiến độ</option>
            <option value="fire_protection">Chống cháy</option>
            <option value="other">Khác</option>
          </select>
        </div>

        <!-- Creator Filter -->
        <div>
          <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Người tạo</label>
          <select v-model="filters.createdBy" class="input text-sm">
            <option value="">Tất cả người tạo</option>
            <option v-for="creator in uniqueCreators" :key="creator.id" :value="creator.id">
              {{ creator.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mt-3">
        <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Tìm kiếm</label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm theo tên pin, mã pin, phòng, mô tả..."
          class="input text-sm"
        />
      </div>
    </section>

    <!-- Loading State -->
    <div v-if="loading" class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <svg class="mx-auto h-10 w-10 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <p class="mt-3 text-sm text-slate-500">Đang tải dữ liệu...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-xl sm:rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
      <svg class="mx-auto h-10 w-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="mt-2 text-sm text-rose-600">{{ error }}</p>
      <button @click="loadData" class="mt-3 rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200">
        Thử lại
      </button>
    </div>

    <!-- Pins Table -->
    <section v-else class="rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <!-- Table Header -->
      <div class="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm sm:text-base font-semibold text-slate-900">
            Danh sách Pin ({{ filteredPins.length }})
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500">{{ filteredPins.length }} / {{ allPins.length }}</span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPins.length === 0" class="p-8 sm:p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="mt-3 text-sm text-slate-500">Không tìm thấy Pin nào</p>
        <p class="mt-1 text-xs text-slate-400">Thử điều chỉnh bộ lọc của bạn</p>
      </div>

      <!-- Table Content (Desktop) -->
      <div v-else class="hidden lg:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Pin</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Dự án</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Phòng</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Trạng thái</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Loại</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Người tạo</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Ngày tạo</th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="pin in paginatedPins"
              :key="pin._id"
              class="hover:bg-slate-50 transition-colors cursor-pointer"
              @click="viewPinDetail(pin)"
            >
              <td class="px-4 py-3">
                <div>
                  <p class="text-sm font-medium text-slate-900">{{ pin.pinName || pin.pinCode }}</p>
                  <p class="text-xs text-slate-500">{{ pin.pinCode }}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <p class="text-sm text-slate-700">{{ getProjectName(pin.projectId) }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="text-sm text-slate-700">{{ pin.roomName || '-' }}</p>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="statusBadge(pin.status)"
                >
                  {{ statusLabel(pin.status) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-slate-700">{{ categoryLabel(pin.category) }}</span>
              </td>
              <td class="px-4 py-3">
                <p class="text-sm text-slate-700">{{ getCreatorName(pin.createdBy) }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="text-xs text-slate-500">{{ formatDate(pin.createdAt) }}</p>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="viewPinDetail(pin)"
                    class="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-brand-600"
                    title="Xem chi tiết"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    v-if="canDeletePin(pin)"
                    @click="confirmDeletePin(pin)"
                    class="rounded-lg p-1.5 text-slate-600 hover:bg-rose-100 hover:text-rose-600"
                    title="Xóa"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card View (Mobile) -->
      <div v-else class="divide-y divide-slate-100 lg:hidden">
        <div
          v-for="pin in paginatedPins"
          :key="pin._id"
          class="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
          @click="viewPinDetail(pin)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-900">{{ pin.pinName || pin.pinCode }}</p>
              <p class="mt-0.5 text-xs text-slate-500">{{ pin.pinCode }}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="statusBadge(pin.status)"
                >
                  {{ statusLabel(pin.status) }}
                </span>
                <span class="text-xs text-slate-600">{{ categoryLabel(pin.category) }}</span>
              </div>
              <div class="mt-2 space-y-1">
                <p class="text-xs text-slate-600">
                  <span class="font-medium">Phòng:</span> {{ pin.roomName || '-' }}
                </p>
                <p class="text-xs text-slate-600">
                  <span class="font-medium">Người tạo:</span> {{ getCreatorName(pin.createdBy) }}
                </p>
                <p class="text-xs text-slate-500">{{ formatDate(pin.createdAt) }}</p>
              </div>
            </div>
            <button
              v-if="canDeletePin(pin)"
              @click.stop="confirmDeletePin(pin)"
              class="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-rose-100 hover:text-rose-600"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3">
        <div class="flex items-center justify-between">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <span class="text-xs text-slate-600">
            Trang {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>
    </section>

    <!-- Pin Detail Modal -->
    <TaskDetail
      v-if="selectedPin"
      :task-id="selectedPin._id"
      :task-data="selectedPin"
      :can-delete-photo="canManageTask(selectedPin)"
      :can-edit-task="canManageTask(selectedPin)"
      @close="selectedPin = null"
      @task-updated="handlePinUpdated"
      @task-deleted="handlePinDeleted"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="!!pinToDelete"
      title="Xóa Pin"
      :message="`Bạn có chắc chắn muốn xóa pin &quot;${pinToDelete?.pinName || pinToDelete?.pinCode}&quot;? Thao tác này không thể hoàn tác.`"
      confirm-text="Xóa"
      cancel-text="Hủy"
      variant="danger"
      @confirm="deletePin"
      @cancel="pinToDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useApi } from '~/composables/api/useApi';
import { useAuth } from '~/composables/state/useAuth';
import { useToast } from '~/composables/state/useToast';
import TaskDetail from '~/components/TaskDetail.vue';
import ConfirmModal from '~/components/ConfirmModal.vue';

// Composables
const api = useApi();
const auth = useAuth();
const toast = useToast();

// Data
const loading = ref(false);
const error = ref('');
const allPins = ref<any[]>([]);
const userProjects = ref<any[]>([]);
const allUsers = ref<any[]>([]);

// Filters
const filters = ref({
  projectId: '',
  status: '',
  category: '',
  createdBy: ''
});
const searchQuery = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(20);

// Modals
const selectedPin = ref<any>(null);
const pinToDelete = ref<any>(null);

// Computed
const hasActiveFilters = computed(() => {
  return !!(filters.value.projectId || filters.value.status || filters.value.category || filters.value.createdBy || searchQuery.value);
});

const filteredPins = computed(() => {
  let result = [...allPins.value];

  // Apply filters
  if (filters.value.projectId) {
    result = result.filter(pin => String(pin.projectId) === filters.value.projectId);
  }
  if (filters.value.status) {
    result = result.filter(pin => pin.status === filters.value.status);
  }
  if (filters.value.category) {
    result = result.filter(pin => pin.category === filters.value.category);
  }
  if (filters.value.createdBy) {
    result = result.filter(pin => String(pin.createdBy) === filters.value.createdBy);
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter(pin => {
      return (
        (pin.pinName || '').toLowerCase().includes(query) ||
        (pin.pinCode || '').toLowerCase().includes(query) ||
        (pin.roomName || '').toLowerCase().includes(query) ||
        (pin.description || '').toLowerCase().includes(query) ||
        (pin.gewerk || '').toLowerCase().includes(query)
      );
    });
  }

  return result;
});

const totalPages = computed(() => Math.ceil(filteredPins.value.length / itemsPerPage.value));

const paginatedPins = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredPins.value.slice(start, end);
});

const uniqueCreators = computed(() => {
  const creatorMap = new Map();
  allPins.value.forEach(pin => {
    if (pin.createdBy && !creatorMap.has(String(pin.createdBy))) {
      const creator = allUsers.value.find(u => String(u._id) === String(pin.createdBy));
      if (creator) {
        creatorMap.set(String(pin.createdBy), {
          id: String(pin.createdBy),
          name: creator.name || creator.email || 'Unknown'
        });
      }
    }
  });
  return Array.from(creatorMap.values());
});

// Methods
const loadData = async () => {
  loading.value = true;
  error.value = '';
  try {
    // Load user projects
    const projectsResponse = await api.get<any>('/projects');
    userProjects.value = projectsResponse.projects || [];

    // Load all pins from all projects
    const pinsResponse = await api.get<any[]>('/tasks');
    allPins.value = pinsResponse || [];

    // Load all users for creator names
    const usersResponse = await api.get<any[]>('/users');
    allUsers.value = usersResponse || [];
  } catch (err: any) {
    error.value = err.message || 'Lỗi khi tải dữ liệu';
    toast.push(error.value, 'error');
  } finally {
    loading.value = false;
  }
};

const clearAllFilters = () => {
  filters.value = {
    projectId: '',
    status: '',
    category: '',
    createdBy: ''
  };
  searchQuery.value = '';
  currentPage.value = 1;
};

const getProjectName = (projectId: string) => {
  const project = userProjects.value.find(p => String(p._id) === String(projectId));
  return project?.name || '-';
};

const getCreatorName = (userId: string) => {
  const user = allUsers.value.find(u => String(u._id) === String(userId));
  return user?.name || user?.email || '-';
};

const viewPinDetail = (pin: any) => {
  selectedPin.value = pin;
};

const canManageTask = (pin: any) => {
  const user = auth.user.value;
  if (!user) return false;

  // Admin can manage all
  const project = userProjects.value.find(p => String(p._id) === String(pin.projectId));
  if (!project) return false;

  const member = project.members?.find((m: any) => String(m.userId) === String(user.id));
  const role = member?.role || 'viewer';

  return role === 'admin' || role === 'technician';
};

const canDeletePin = (pin: any) => {
  const user = auth.user.value;
  if (!user) return false;

  // Creator can delete their own pins
  if (String(pin.createdBy) === String(user.id)) return true;

  // Admin can delete any pin
  const project = userProjects.value.find(p => String(p._id) === String(pin.projectId));
  if (!project) return false;

  const member = project.members?.find((m: any) => String(m.userId) === String(user.id));
  return member?.role === 'admin';
};

const confirmDeletePin = (pin: any) => {
  pinToDelete.value = pin;
};

const deletePin = async () => {
  if (!pinToDelete.value) return;

  try {
    await api.delete(`/tasks/${pinToDelete.value._id}`);
    toast.push('Đã xóa Pin thành công', 'success');

    // Remove from list
    allPins.value = allPins.value.filter(p => p._id !== pinToDelete.value._id);
    pinToDelete.value = null;
  } catch (err: any) {
    toast.push(err.message || 'Lỗi khi xóa Pin', 'error');
  }
};

const handlePinUpdated = async () => {
  await loadData();
  toast.push('Đã cập nhật Pin', 'success');
};

const handlePinDeleted = async () => {
  selectedPin.value = null;
  await loadData();
  toast.push('Đã xóa Pin', 'success');
};

const formatDate = (date: string | Date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Status & Category helpers
const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    instruction: 'Hướng dẫn',
    rfi: 'RFI',
    resolved: 'Hoàn thành',
    approved: 'QA duyệt',
    open: 'Mở',
    in_progress: 'Đang làm',
    blocked: 'Bị chặn',
    done: 'Xong'
  };
  return labels[status] || status;
};

const statusBadge = (status: string) => {
  const badges: Record<string, string> = {
    instruction: 'bg-slate-100 text-slate-700',
    rfi: 'bg-amber-100 text-amber-700',
    resolved: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    open: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-amber-100 text-amber-700',
    blocked: 'bg-amber-100 text-amber-700',
    done: 'bg-blue-100 text-blue-700'
  };
  return badges[status] || 'bg-slate-100 text-slate-700';
};

const categoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    quality: 'Chất lượng',
    safety: 'An toàn',
    progress: 'Tiến độ',
    fire_protection: 'Chống cháy',
    other: 'Khác'
  };
  return labels[category] || category;
};

// Watchers
watch(() => filters.value, () => {
  currentPage.value = 1;
}, { deep: true });

watch(searchQuery, () => {
  currentPage.value = 1;
});

// Lifecycle
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:bg-slate-50 disabled:text-slate-500;
}
</style>
