<template>
  <div>
    <div
      class="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100"
      :class="selectedId === node.id ? 'bg-brand-50 text-brand-700' : 'text-slate-700'"
      :style="{ paddingLeft: `${level * 12 + 8}px` }"
    >
      <!-- Expand/Collapse button -->
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

      <!-- Node icon -->
      <span class="shrink-0" :class="iconClass">
        <component :is="nodeIcon" class="h-4 w-4" />
      </span>

      <!-- Node name (clickable) -->
      <button class="flex-1 truncate text-left" @click="emit('select', node)">
        <span class="font-medium">{{ node.name }}</span>
      </button>

      <!-- Action buttons (always visible) -->
      <div class="flex shrink-0 items-center gap-0.5">
        <!-- Delete button -->
        <button
          class="flex h-7 w-7 items-center justify-center rounded text-rose-500 hover:bg-rose-50 active:bg-rose-100"
          :title="deleteLabel"
          @click.stop="emit('delete', { nodeId: node.id, nodeType: node.type, nodeName: node.name })"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <!-- Add child button -->
        <button
          v-if="canAddChild"
          class="flex h-7 w-7 items-center justify-center rounded text-brand-500 hover:bg-brand-50 active:bg-brand-100"
          :title="addChildLabel"
          @click.stop="emit('add-child', { parentId: node.id, parentType: node.type, childType: childType })"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Children -->
    <div v-if="hasChildren && expanded" class="mt-0.5">
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :selected-id="selectedId"
        @select="emit('select', $event)"
        @add-child="emit('add-child', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectTreeNode } from "~/composables/api/useProjectTree";

const props = defineProps<{ node: ProjectTreeNode; level: number; selectedId?: string }>();
const { node, level } = toRefs(props);

const emit = defineEmits<{
  (e: "select", node: ProjectTreeNode): void;
  (e: "add-child", payload: { parentId: string; parentType: string; childType: string }): void;
  (e: "delete", payload: { nodeId: string; nodeType: string; nodeName: string }): void;
}>();

const expanded = ref(true);
const hasChildren = computed(() => (node.value.children || []).length > 0);

const toggle = () => {
  expanded.value = !expanded.value;
};

// Xác định child type dựa vào parent type
const childType = computed(() => {
  const childMap: Record<string, string> = {
    project: "building",
    building: "floor",
    floor: "discipline",
    discipline: "drawing",
    drawing: "task"
  };
  return childMap[node.value.type] || "";
});

const canAddChild = computed(() => {
  // KHÔNG cho phép tạo task từ tree - phải vào bản vẽ mới tạo được
  return ["project", "building", "floor", "discipline"].includes(node.value.type);
});

const addChildLabel = computed(() => {
  const labels: Record<string, string> = {
    project: "Thêm toà nhà",
    building: "Thêm tầng",
    floor: "Thêm bộ môn",
    discipline: "Thêm bản vẽ",
    drawing: "Thêm Task"
  };
  return labels[node.value.type] || "Thêm";
});

const deleteLabel = computed(() => {
  const labels: Record<string, string> = {
    project: "Xoá dự án",
    building: "Xoá toà nhà",
    floor: "Xoá tầng",
    discipline: "Xoá bộ môn",
    drawing: "Xoá bản vẽ",
    task: "Xoá Task"
  };
  return labels[node.value.type] || "Xoá";
});

// Icon theo type
const nodeIcon = computed(() => {
  return "span"; // Placeholder - sẽ dùng icon thực
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
