<script setup lang="ts">
import { Handle, Position, useNode } from "@vue-flow/core";
import { Sparkles } from "lucide-vue-next";

const { node } = useNode<{ label?: string; modelName?: string }>();
</script>

<template>
  <div
    class="llm-node"
    :class="{ selected: node.selected }"
  >
    <Handle type="target" :position="Position.Left" :connectable-start="false" :connectable-end="true" />
    <div class="flex items-center gap-2 px-4 py-3">
      <Sparkles class="h-4 w-4 text-blue-600" />
      <div>
        <div class="text-sm font-medium text-blue-900">{{ node.data?.label || "LLM" }}</div>
        <div v-if="node.data?.modelName" class="text-xs text-blue-500">{{ node.data.modelName }}</div>
      </div>
    </div>
    <Handle type="source" :position="Position.Right" :connectable-start="true" :connectable-end="false" />
  </div>
</template>

<style scoped>
.llm-node {
  background: #eff6ff;
  border: 2px solid #93c5fd;
  border-radius: 12px;
  min-width: 160px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.llm-node.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
</style>
