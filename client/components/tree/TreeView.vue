<template>
  <div class="space-y-0.5">
    <TreeNode
      v-for="node in rootNodes"
      :key="node.id"
      :node="node"
      :children-by-parent-id="childrenByParentId"
      :level="0"
      :selected-id="selectedId"
      @select="emit('select', $event)"
      @add-child="emit('add-child', $event)"
      @delete="emit('delete', $event)"
      @rename="emit('rename', $event)"
      @reorder="emit('reorder', $event)"
      @duplicate="emit('duplicate', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ProjectTreeNode } from "~/composables/api/useProjectTree";

const props = defineProps<{
  rootIds: string[];
  nodeMap: Map<string, ProjectTreeNode>;
  childrenByParentId: Map<string, ProjectTreeNode[]>;
  selectedId?: string;
}>();

const emit = defineEmits<{
  (e: "select", node: ProjectTreeNode): void;
  (e: "add-child", payload: { parentId: string; parentType: string; childType: string }): void;
  (e: "delete", payload: { nodeId: string; nodeType: string; nodeName: string }): void;
  (e: "rename", payload: { nodeId: string; nodeType: string; newName: string }): void;
  (e: "reorder", payload: { nodeId: string; nodeType: string; direction: "up" | "down" }): void;
  (e: "duplicate", payload: { nodeId: string; nodeType: string }): void;
}>();

const rootNodes = computed(() => {
  return props.rootIds
    .map((id) => props.nodeMap.get(id))
    .filter((node): node is ProjectTreeNode => !!node);
});
</script>
