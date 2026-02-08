<template>
  <aside class="flex h-screen flex-col border-r border-slate-200 bg-white">
    <div class="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-slate-900">Cây Dự Án</h2>
        <p class="hidden text-xs text-slate-400 sm:block">Project → Building → Floor → Discipline → Drawing → Task</p>
      </div>
      <!-- Nút đóng sidebar trên mobile -->
      <button
        class="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
        @click="$emit('navigate')"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Nút tạo Project mới -->
    <div class="border-b border-slate-100 px-4 py-3">
      <button
        class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-100"
        @click="openCreateForm('project')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tạo Project
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-2 py-3">
      <div v-if="loading" class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
        <svg class="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        Đang tải...
      </div>
      <div v-else-if="error" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">
        {{ error }}
      </div>
      <div v-else-if="tree.length === 0" class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
        Chưa có project nào.<br />Bấm nút "Tạo Project" để bắt đầu.
      </div>
      <TreeView
        v-else
        :nodes="tree"
        :selected-id="selected?.id"
        @select="handleSelect"
        @add-child="handleAddChild"
        @delete="handleDelete"
      />
    </div>

    <div class="border-t border-slate-100 px-4 py-3">
      <button
        class="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100"
        @click="fetchTree"
      >
        Làm mới
      </button>
    </div>

    <!-- Create Form Modal -->
    <CreateForm
      :show="showCreateForm"
      :type="createFormType"
      :parent-id="createFormParentId"
      @close="closeCreateForm"
      @created="handleCreated"
    />

    <!-- Confirm Delete Modal -->
    <ConfirmModal
      :show="showDeleteConfirm"
      :title="deleteConfirmTitle"
      :message="deleteConfirmMessage"
      confirm-text="Xoá"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </aside>
</template>

<script setup lang="ts">
import { useProjectTree, type ProjectTreeNode } from "~/composables/api/useProjectTree";
import { useSelectedNode, type SelectedNode } from "~/composables/state/useSelectedNode";
import type { CreateFormType } from "~/components/forms/CreateForm.vue";
import { useApi } from "~/composables/api/useApi";
import { useToast } from "~/composables/state/useToast";

const emit = defineEmits<{
  navigate: [];
}>();

const { tree, loading, error, fetchTree } = useProjectTree();
const selected = useSelectedNode();
const api = useApi();
const toast = useToast();

// Create form state
const showCreateForm = ref(false);
const createFormType = ref<CreateFormType>("project");
const createFormParentId = ref<string | undefined>(undefined);

// Delete confirm state
const showDeleteConfirm = ref(false);
const deleteTarget = ref<{ nodeId: string; nodeType: string; nodeName: string } | null>(null);

const deleteConfirmTitle = computed(() => {
  if (!deleteTarget.value) return "";
  const labels: Record<string, string> = {
    project: "Xoá dự án?",
    building: "Xoá toà nhà?",
    floor: "Xoá tầng?",
    discipline: "Xoá bộ môn?",
    drawing: "Xoá bản vẽ?"
  };
  return labels[deleteTarget.value.nodeType] || "Xoá?";
});

const deleteConfirmMessage = computed(() => {
  if (!deleteTarget.value) return "";
  return `Bạn có chắc muốn xoá "${deleteTarget.value.nodeName}"? Tất cả dữ liệu bên trong sẽ bị xoá vĩnh viễn.`;
});

const handleSelect = (node: ProjectTreeNode) => {
  selected.value = { id: node.id, name: node.name, type: node.type } as SelectedNode;
  emit("navigate");
};

const handleAddChild = (payload: { parentId: string; parentType: string; childType: string }) => {
  createFormParentId.value = payload.parentId;
  createFormType.value = payload.childType as CreateFormType;
  showCreateForm.value = true;
};

const handleDelete = (payload: { nodeId: string; nodeType: string; nodeName: string }) => {
  deleteTarget.value = payload;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;

  const { nodeId, nodeType } = deleteTarget.value;

  try {
    const endpoints: Record<string, string> = {
      project: `/api/projects/${nodeId}`,
      building: `/api/buildings/${nodeId}`,
      floor: `/api/floors/${nodeId}`,
      discipline: `/api/disciplines/${nodeId}`,
      drawing: `/api/drawings/${nodeId}`,
      task: `/api/tasks/${nodeId}`
    };

    const endpoint = endpoints[nodeType];
    if (!endpoint) {
      toast.push("Không thể xoá loại này", "error");
      return;
    }

    await api.delete(endpoint);
    toast.push(`Đã xoá ${deleteTarget.value.nodeName}`, "success");

    // Clear selection if deleted node was selected
    if (selected.value?.id === nodeId) {
      selected.value = null;
    }

    // Refresh tree
    await fetchTree();
  } catch (err) {
    toast.push((err as Error).message || "Lỗi khi xoá", "error");
  } finally {
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
  }
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  deleteTarget.value = null;
};

const openCreateForm = (type: CreateFormType, parentId?: string) => {
  createFormType.value = type;
  createFormParentId.value = parentId;
  showCreateForm.value = true;
};

const closeCreateForm = () => {
  showCreateForm.value = false;
};

const handleCreated = () => {
  // Tree se tu dong refresh trong CreateForm
};

onMounted(fetchTree);
</script>
