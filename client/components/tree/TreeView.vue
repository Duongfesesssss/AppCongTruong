<template>
  <div class="space-y-0.5">
    <TreeNode
      v-for="node in nodes"
      :key="node.id"
      :node="node"
      :level="0"
      :selected-id="selectedId"
      @select="emit('select', $event)"
      @add-child="emit('add-child', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ProjectTreeNode } from "~/composables/api/useProjectTree";

defineProps<{ nodes: ProjectTreeNode[]; selectedId?: string }>();

const emit = defineEmits<{
  (e: "select", node: ProjectTreeNode): void;
  (e: "add-child", payload: { parentId: string; parentType: string; childType: string }): void;
  (e: "delete", payload: { nodeId: string; nodeType: string; nodeName: string }): void;
}>();
</script>
