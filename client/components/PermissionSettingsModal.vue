<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div class="w-full max-w-5xl rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
          <!-- Header -->
          <div class="border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-slate-900 sm:text-lg">
                  Cài đặt quyền (Permission Matrix)
                </h3>
                <p class="truncate text-xs text-slate-500">
                  {{ projectName ? `Project: ${projectName}` : "Quản lý quyền theo vai trò" }}
                </p>
              </div>
              <button
                class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                type="button"
                @click="emit('close')"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="max-h-[70vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <!-- Loading state -->
            <div v-if="loading" class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Đang tải cài đặt quyền...
            </div>

            <!-- Error state -->
            <div v-else-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <p>{{ loadError }}</p>
              <button
                type="button"
                class="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                @click="fetchPermissions"
              >
                Thử lại
              </button>
            </div>

            <!-- Main content -->
            <div v-else>
              <!-- Role selector -->
              <div class="mb-4">
                <label class="mb-2 block text-sm font-medium text-slate-700">Chọn vai trò để cấu hình</label>
                <select
                  v-model="selectedRole"
                  class="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  :disabled="!canEdit"
                >
                  <option v-for="role in availableRoles" :key="role.key" :value="role.key">
                    {{ role.label }}
                  </option>
                </select>
              </div>

              <!-- Permission list grouped by category -->
              <div v-if="selectedRole" class="space-y-4">
                <div v-for="category in permissionCategories" :key="category" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 class="mb-3 text-sm font-semibold text-slate-900">{{ category }}</h4>
                  <div class="space-y-2">
                    <label
                      v-for="perm in getPermissionsByCategory(category)"
                      :key="perm.key"
                      class="flex items-start gap-3 rounded-lg bg-white p-3 hover:bg-slate-50"
                      :class="{ 'cursor-not-allowed opacity-50': !canEdit }"
                    >
                      <input
                        type="checkbox"
                        :checked="isPermissionChecked(perm.key)"
                        :disabled="!canEdit || isPermissionLocked(perm.key)"
                        class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500/20"
                        @change="togglePermission(perm.key)"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium text-slate-900">{{ perm.label }}</span>
                          <span
                            v-if="isPermissionLocked(perm.key)"
                            class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                          >
                            Bắt buộc
                          </span>
                        </div>
                        <p class="mt-0.5 text-xs text-slate-500">{{ perm.description }}</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Not admin warning -->
              <div v-if="!canEdit" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div class="flex items-start gap-2">
                  <svg class="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <p>Chỉ Admin mới có quyền chỉnh sửa cài đặt quyền. Bạn đang ở chế độ xem.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div class="flex items-center gap-2">
              <button
                v-if="canEdit"
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="saving || loading"
                @click="resetToDefault"
              >
                Reset về mặc định
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                @click="emit('close')"
              >
                Đóng
              </button>
              <button
                v-if="canEdit"
                type="button"
                class="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!hasChanges || saving"
                @click="savePermissions"
              >
                {{ saving ? "Đang lưu..." : "Lưu thay đổi" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";

type PermissionKey = string;

type PermissionMetadata = {
  label: string;
  description: string;
  category: string;
};

type RoleInfo = {
  key: string;
  label: string;
};

type PermissionsResponse = {
  projectId: string;
  myRole: string;
  myPermissions: Record<PermissionKey, boolean>;
  permissionMatrix: {
    roles: Record<string, Record<PermissionKey, boolean>>;
  };
  metadata: {
    permissions: Record<PermissionKey, PermissionMetadata>;
    roles: RoleInfo[];
    permissionKeys: PermissionKey[];
  };
  canEdit: boolean;
};

const props = defineProps<{
  show: boolean;
  projectId: string;
  projectName?: string;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
}>();

const api = useApi();
const toast = useToast();

const loading = ref(false);
const loadError = ref("");
const saving = ref(false);

const permissionsData = ref<PermissionsResponse | null>(null);
const originalMatrix = ref<Record<string, Record<PermissionKey, boolean>>>({});
const workingMatrix = ref<Record<string, Record<PermissionKey, boolean>>>({});
const selectedRole = ref("");

const canEdit = computed(() => permissionsData.value?.canEdit ?? false);

const availableRoles = computed(() => {
  return permissionsData.value?.metadata?.roles || [];
});

const permissionMetadata = computed(() => {
  return permissionsData.value?.metadata?.permissions || {};
});

const permissionCategories = computed(() => {
  const categories = new Set<string>();
  Object.values(permissionMetadata.value).forEach((meta) => {
    categories.add(meta.category);
  });
  return Array.from(categories).sort();
});

const hasChanges = computed(() => {
  return JSON.stringify(workingMatrix.value) !== JSON.stringify(originalMatrix.value);
});

const getPermissionsByCategory = (category: string) => {
  return Object.entries(permissionMetadata.value)
    .filter(([_, meta]) => meta.category === category)
    .map(([key, meta]) => ({
      key,
      ...meta
    }));
};

const isPermissionChecked = (permKey: PermissionKey): boolean => {
  if (!selectedRole.value) return false;
  return workingMatrix.value[selectedRole.value]?.[permKey] ?? false;
};

const isPermissionLocked = (permKey: PermissionKey): boolean => {
  // Admin role always has project.manage_permissions locked to true
  if (selectedRole.value === "admin" && permKey === "project.manage_permissions") {
    return true;
  }
  return false;
};

const togglePermission = (permKey: PermissionKey) => {
  if (!selectedRole.value || !canEdit.value || isPermissionLocked(permKey)) return;

  if (!workingMatrix.value[selectedRole.value]) {
    workingMatrix.value[selectedRole.value] = {};
  }

  const currentValue = workingMatrix.value[selectedRole.value][permKey] ?? false;
  workingMatrix.value[selectedRole.value][permKey] = !currentValue;
};

const fetchPermissions = async () => {
  if (!props.projectId) return;

  loading.value = true;
  loadError.value = "";
  try {
    const data = await api.get<PermissionsResponse>(`/projects/${props.projectId}/permissions`);
    permissionsData.value = data;
    originalMatrix.value = JSON.parse(JSON.stringify(data.permissionMatrix.roles));
    workingMatrix.value = JSON.parse(JSON.stringify(data.permissionMatrix.roles));

    // Set default selected role
    if (availableRoles.value.length > 0) {
      selectedRole.value = availableRoles.value[0].key;
    }
  } catch (err) {
    loadError.value = (err as Error).message || "Không thể tải cài đặt quyền";
  } finally {
    loading.value = false;
  }
};

const savePermissions = async () => {
  if (!canEdit.value || !hasChanges.value) return;

  saving.value = true;
  try {
    await api.put(`/projects/${props.projectId}/permissions`, {
      permissionMatrix: {
        roles: workingMatrix.value
      }
    });

    toast.push("Đã lưu cài đặt quyền thành công", "success");
    originalMatrix.value = JSON.parse(JSON.stringify(workingMatrix.value));
    emit("updated");
  } catch (err) {
    toast.push((err as Error).message || "Không thể lưu cài đặt quyền", "error");
  } finally {
    saving.value = false;
  }
};

const resetToDefault = async () => {
  if (!canEdit.value) return;

  const confirmed = confirm("Bạn có chắc chắn muốn reset tất cả quyền về mặc định không?");
  if (!confirmed) return;

  saving.value = true;
  try {
    await api.post(`/projects/${props.projectId}/permissions/reset`, {});
    toast.push("Đã reset quyền về mặc định", "success");
    await fetchPermissions();
    emit("updated");
  } catch (err) {
    toast.push((err as Error).message || "Không thể reset quyền", "error");
  } finally {
    saving.value = false;
  }
};

watch(
  () => props.show,
  async (visible) => {
    if (!visible) {
      // Reset state when closing
      if (hasChanges.value) {
        const shouldDiscard = confirm("Bạn có thay đổi chưa lưu. Bạn có muốn bỏ qua không?");
        if (!shouldDiscard) {
          // Prevent closing
          return;
        }
      }
      loadError.value = "";
      return;
    }
    await fetchPermissions();
  }
);

watch(
  () => props.projectId,
  async (projectId, prevProjectId) => {
    if (!props.show) return;
    if (!projectId || projectId === prevProjectId) return;
    await fetchPermissions();
  }
);
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
