<script setup lang="ts">
import { Handle, Position, useNode } from "@vue-flow/core";
import { Repeat } from "lucide-vue-next";

const { node } = useNode<{ label?: string }>();
</script>

<template>
  <div class="loop-node" :class="{ selected: node.selected }">
    <Handle type="target" :position="Position.Left" :connectable-start="false" :connectable-end="true" />
    <div class="flex items-center gap-2 px-4 py-3">
      <Repeat class="h-4 w-4 text-violet-600" />
      <span class="text-sm font-medium text-violet-900">{{ node.data?.label || "循环" }}</span>
    </div>
    <Handle type="source" :position="Position.Right" :connectable-start="true" :connectable-end="false" />
  </div>
</template>

<style scoped>
.loop-node {
  background: #f5f3ff;
  border: 2px solid #c4b5fd;
  border-radius: 12px;
  min-width: 160px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.loop-node.selected {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}
</style>
