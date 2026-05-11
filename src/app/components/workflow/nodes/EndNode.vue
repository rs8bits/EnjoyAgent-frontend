<script setup lang="ts">
import { Handle, Position, useNode } from "@vue-flow/core";
import { StopCircle } from "lucide-vue-next";

const { node } = useNode<{ label?: string }>();
</script>

<template>
  <div
    class="end-node"
    :class="{ selected: node.selected }"
  >
    <Handle type="target" :position="Position.Left" :connectable-start="false" :connectable-end="true" />
    <div class="flex items-center gap-2 px-4 py-3">
      <StopCircle class="h-4 w-4 text-rose-600" />
      <span class="text-sm font-medium text-rose-900">{{ node.data?.label || "结束" }}</span>
    </div>
  </div>
</template>

<style scoped>
.end-node {
  background: #fff1f2;
  border: 2px solid #fda4af;
  border-radius: 12px;
  min-width: 160px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.end-node.selected {
  border-color: #f43f5e;
  box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.2);
}
</style>
