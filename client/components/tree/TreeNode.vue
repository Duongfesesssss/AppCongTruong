<template>
  <div>
    <div
      class="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100"
      :class="selectedId === node.id ? 'bg-brand-50 text-brand-700' : 'text-slate-700'"
      :style="{ paddingLeft: `${level * 12 + 8}px` }"
    >
      <button
        v-if="hasChildren"
        class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        @click.stop="toggle"
      >
        <svg
          class="h-3 w-3 transition-transform"
          :class="{ 'rotate-90': expanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <span v-else class="h-5 w-5 shrink-0"></span>

      <span class="shrink-0" :class="iconClass">
        <component :is="nodeIcon" class="h-4 w-4" />
      </span>

      <input
        v-if="editing"
        ref="renameInput"
        v-model="editName"
        class="flex-1 rounded border border-brand-300 bg-white px-1 py-0.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-brand-400/30"
        @keydown.enter="confirmRename"
        @keydown.escape="cancelRename"
        @blur="confirmRename"
      />
      <button
        v-else
        class="flex-1 truncate text-left"
        @click="handleSelect"
        @dblclick.stop="canRename ? startRename() : undefined"
      >
        <span class="font-medium">{{ node.name }}</span>
      </button>

      <!-- Filter icon — chỉ hiển thị ở project node -->
      <button
        v-if="node.type === 'project'"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-slate-200"
        :class="hasActiveFilter ? 'text-brand-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'"
        :title="hasActiveFilter ? 'Đang lọc — bấm để chỉnh' : 'Lọc bản vẽ'"
        @click.stop="emit('filter', node.id)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>

      <div v-if="hasMenuActions" ref="menuRef" class="relative shrink-0">
        <button
          class="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          title="Thao tác"
          aria-label="Mở menu thao tác"
          @click.stop="toggleMenu"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        </button>

        <div
          v-if="menuOpen"
          class="absolute right-0 top-8 z-30 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          <button
            v-if="canAddChild"
            class="w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
            @click.stop="handleAddChild"
          >
            {{ addChildLabel }}
          </button>
          <button
            v-if="canRename"
            class="w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
            @click.stop="handleRenameFromMenu"
          >
            Đổi tên
          </button>
          <button
            v-if="canReorder"
            class="w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
            @click.stop="handleReorder('up')"
          >
            Đưa lên
          </button>
          <button
            v-if="canReorder"
            class="w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
            @click.stop="handleReorder('down')"
          >
            Đưa xuống
          </button>
          <button
            v-if="canDuplicate"
            class="w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
            @click.stop="handleDuplicate"
          >
            Nhân bản
          </button>
          <button
            v-if="canDelete"
            class="w-full rounded px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50"
            @click.stop="handleDelete"
          >
            {{ deleteLabel }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="hasChildren && expanded && node.type !== 'drawing'" class="mt-0.5">
      <TreeNode
        v-for="child in visibleChildNodes"
        :key="child.id"
        :node="child"
        :children-by-parent-id="childrenByParentId"
        :level="level + 1"
        :selected-id="selectedId"
        :active-filters="activeFilters"
        @select="emit('select', $event)"
        @add-child="emit('add-child', $event)"
        @delete="emit('delete', $event)"
        @rename="emit('rename', $event)"
        @reorder="emit('reorder', $event)"
        @duplicate="emit('duplicate', $event)"
        @filter="emit('filter', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectTreeNode } from "~/composables/api/useProjectTree";

import type { ProjectFilterSelections } from "~/components/ProjectFilterModal.vue";

const props = defineProps<{
  node: ProjectTreeNode;
  childrenByParentId: Map<string, ProjectTreeNode[]>;
  level: number;
  selectedId?: string;
  activeFilters?: Map<string, ProjectFilterSelections>;
}>();
const { node, level, childrenByParentId } = toRefs(props);

const emit = defineEmits<{
  (e: "select", node: ProjectTreeNode): void;
  (e: "add-child", payload: { parentId: string; parentType: string; childType: string }): void;
  (e: "delete", payload: { nodeId: string; nodeType: string; nodeName: string }): void;
  (e: "rename", payload: { nodeId: string; nodeType: string; newName: string }): void;
  (e: "reorder", payload: { nodeId: string; nodeType: string; direction: "up" | "down" }): void;
  (e: "duplicate", payload: { nodeId: string; nodeType: string }): void;
  (e: "filter", projectId: string): void;
}>();

const expanded = ref(true);
const editing = ref(false);
const editName = ref("");
const renameInput = ref<HTMLInputElement | null>(null);
const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const childNodes = computed(() => {
  return childrenByParentId.value.get(node.value.id) || [];
});

// Filter selections for this project (only relevant when node is a project)
const nodeFilterSelections = computed<ProjectFilterSelections | undefined>(() => {
  if (node.value.type !== "project") return undefined;
  return props.activeFilters?.get(node.value.id);
});

const hasActiveFilter = computed(() => {
  const sel = nodeFilterSelections.value;
  if (!sel) return false;
  return Object.values(sel).some((v) => v.length > 0);
});

// Drawings are filtered when this is a project node with active filters
const visibleChildNodes = computed(() => {
  const children = childNodes.value;
  const sel = nodeFilterSelections.value;
  if (!sel || !Object.values(sel).some((v) => v.length > 0)) return children;

  return children.filter((child) => {
    if (child.type !== "drawing") return true;
    const tagNames = child.metadata.tagNames ?? [];
    for (const [fieldType, values] of Object.entries(sel)) {
      if (!values.length) continue;
      const hasMatch = values.some((val) =>
        tagNames.some((tag) => tag.toLowerCase() === `${fieldType}:${val.toLowerCase()}`)
      );
      if (!hasMatch) return false;
    }
    return true;
  });
});

const hasChildren = computed(() => {
  if (node.value.type === "drawing") return false;
  return childNodes.value.length > 0;
});

const toggle = () => {
  expanded.value = !expanded.value;
};

const closeMenu = () => {
  menuOpen.value = false;
};

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const startRename = () => {
  if (!canRename.value) return;
  closeMenu();
  editName.value = node.value.name;
  editing.value = true;
  nextTick(() => {
    renameInput.value?.focus();
    renameInput.value?.select();
  });
};

const confirmRename = () => {
  if (!editing.value) return;
  editing.value = false;
  const trimmed = editName.value.trim();
  if (trimmed && trimmed !== node.value.name) {
    emit("rename", { nodeId: node.value.id, nodeType: node.value.type, newName: trimmed });
  }
};

const cancelRename = () => {
  editing.value = false;
  editName.value = "";
};

const handleSelect = () => {
  closeMenu();
  emit("select", node.value);
};

const childType = computed(() => {
  const childMap: Record<string, string> = {
    project: "drawing",
    drawing: "task"
  };
  return childMap[node.value.type] || "";
});

const canAddChild = computed(() => {
  // Technicians and admins can upload drawings
  return node.value.canManageDrawings && node.value.type === "project";
});

const canReorder = computed(() => {
  return node.value.canManageStructure && ["project", "drawing"].includes(node.value.type);
});

const canDuplicate = computed(() => {
  return node.value.canManageStructure && ["project", "drawing"].includes(node.value.type);
});

const canRename = computed(() => {
  if (node.value.type === "task") return false;
  // Members can rename drawings; only admin can rename structural nodes
  if (node.value.type === "drawing") return node.value.canManageDrawings;
  return node.value.canManageStructure;
});

const canDelete = computed(() => {
  // Members can delete drawings/tasks they created (server enforces creator check)
  if (node.value.type === "drawing" || node.value.type === "task") return node.value.canManageDrawings;
  // Structural nodes (project, building, floor, discipline) — admin only
  return node.value.canManageStructure;
});

const hasMenuActions = computed(() => {
  return canAddChild.value || canRename.value || canReorder.value || canDuplicate.value || canDelete.value;
});

const addChildLabel = computed(() => {
  const labels: Record<string, string> = {
    project: "Thêm bản vẽ",
    building: "Thêm tầng",
    floor: "Thêm bộ môn",
    discipline: "Thêm bản vẽ",
    drawing: "Thêm Task"
  };
  return labels[node.value.type] || "Thêm";
});
const deleteLabel = computed(() => {
  const labels: Record<string, string> = {
    project: "Xóa dự án",
    building: "Xóa tòa nhà",
    floor: "Xóa tầng",
    discipline: "Xóa bộ môn",
    drawing: "Xóa bản vẽ",
    task: "Xóa Task"
  };
  return labels[node.value.type] || "Xóa";
});

const handleAddChild = () => {
  closeMenu();
  emit("add-child", {
    parentId: node.value.id,
    parentType: node.value.type,
    childType: childType.value
  });
};

const handleRenameFromMenu = () => {
  startRename();
};

const handleReorder = (direction: "up" | "down") => {
  closeMenu();
  emit("reorder", { nodeId: node.value.id, nodeType: node.value.type, direction });
};

const handleDuplicate = () => {
  closeMenu();
  emit("duplicate", { nodeId: node.value.id, nodeType: node.value.type });
};

const handleDelete = () => {
  if (!canDelete.value) return;
  closeMenu();
  emit("delete", { nodeId: node.value.id, nodeType: node.value.type, nodeName: node.value.name });
};

const handleGlobalPointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null;
  if (!target || !menuRef.value) return;
  if (menuRef.value.contains(target)) return;
  closeMenu();
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    closeMenu();
  }
};

watch(menuOpen, (isOpen) => {
  if (typeof document === "undefined") return;
  if (isOpen) {
    document.addEventListener("pointerdown", handleGlobalPointerDown);
    document.addEventListener("keydown", handleGlobalKeydown);
    return;
  }
  document.removeEventListener("pointerdown", handleGlobalPointerDown);
  document.removeEventListener("keydown", handleGlobalKeydown);
});

watch(
  () => props.selectedId,
  () => {
    closeMenu();
  }
);

onBeforeUnmount(() => {
  if (typeof document === "undefined") return;
  document.removeEventListener("pointerdown", handleGlobalPointerDown);
  document.removeEventListener("keydown", handleGlobalKeydown);
});

const nodeIcon = computed(() => {
  return "span";
});

const iconClass = computed(() => {
  const classes: Record<string, string> = {
    project: "text-blue-500",
    building: "text-emerald-500",
    floor: "text-amber-500",
    discipline: "text-purple-500",
    drawing: "text-rose-500",
    task: "text-slate-500"
  };
  return classes[node.value.type] || "text-slate-400";
});
</script>

