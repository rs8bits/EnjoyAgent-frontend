<script setup lang="ts">
import { Handle, Position, useNode } from "@vue-flow/core";
import { Play } from "lucide-vue-next";

const { node } = useNode<{ label?: string }>();
</script>

<template>
  <div
    class="start-node"
    :class="{ selected: node.selected }"
  >
    <div class="flex items-center gap-2 px-4 py-3">
      <Play class="h-4 w-4 text-emerald-600" />
      <span class="text-sm font-medium text-emerald-900">{{ node.data?.label || "开始" }}</span>
    </div>
    <Handle type="source" :position="Position.Right" :connectable-start="true" :connectable-end="false" />
  </div>
</template>

<style scoped>
.start-node {
  background: #ecfdf5;
  border: 2px solid #6ee7b7;
  border-radius: 12px;
  min-width: 160px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.start-node.selected {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}
</style>
