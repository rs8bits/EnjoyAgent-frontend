<script setup lang="ts">
import { Handle, Position, useNode } from "@vue-flow/core";
import { GitBranch } from "lucide-vue-next";

const { node } = useNode<{ label?: string }>();
</script>

<template>
  <div class="condition-node" :class="{ selected: node.selected }">
    <Handle type="target" :position="Position.Left" :connectable-start="false" :connectable-end="true" />
    <div class="flex items-center gap-2 px-4 py-3">
      <GitBranch class="h-4 w-4 text-amber-600" />
      <span class="text-sm font-medium text-amber-900">{{ node.data?.label || "条件判断" }}</span>
    </div>
    <div class="flex justify-between px-4 pb-3">
      <div class="flex items-center gap-1">
        <span class="text-xs text-emerald-600">true</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-xs text-rose-500">false</span>
      </div>
    </div>
    <Handle id="true" type="source" :position="Position.Right" class="handle-true" :connectable-start="true" :connectable-end="false" />
    <Handle id="false" type="source" :position="Position.Right" class="handle-false" :connectable-start="true" :connectable-end="false" />
  </div>
</template>

<style scoped>
.condition-node {
  background: #fffbeb;
  border: 2px solid #fde68a;
  border-radius: 12px;
  min-width: 160px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.condition-node.selected {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}
.handle-true {
  top: 42% !important;
}
.handle-false {
  top: 72% !important;
}
</style>
