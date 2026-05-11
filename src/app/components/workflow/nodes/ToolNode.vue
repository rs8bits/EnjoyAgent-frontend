<script setup lang="ts">
import { Handle, Position, useNode } from "@vue-flow/core";
import { Wrench } from "lucide-vue-next";

const { node } = useNode<{ label?: string }>();
</script>

<template>
  <div class="tool-node" :class="{ selected: node.selected }">
    <Handle type="target" :position="Position.Left" :connectable-start="false" :connectable-end="true" />
    <div class="flex items-center gap-2 px-4 py-3">
      <Wrench class="h-4 w-4 text-orange-600" />
      <span class="text-sm font-medium text-orange-900">{{ node.data?.label || "工具调用" }}</span>
    </div>
    <Handle type="source" :position="Position.Right" :connectable-start="true" :connectable-end="false" />
  </div>
</template>

<style scoped>
.tool-node {
  background: #fff7ed;
  border: 2px solid #fdba74;
  border-radius: 12px;
  min-width: 160px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.tool-node.selected {
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
}
</style>
