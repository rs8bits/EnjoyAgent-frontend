<script setup lang="ts">
import { Handle, Position, useNode } from "@vue-flow/core";
import { Boxes } from "lucide-vue-next";
const { node } = useNode<{ label?: string }>();
</script>
<template>
  <div class="min-w-40 rounded-xl border-2 bg-cyan-50 shadow-sm" :class="node.selected ? 'border-cyan-600 ring-2 ring-cyan-100' : 'border-cyan-300'">
    <Handle type="target" :position="Position.Left" :connectable-start="false" :connectable-end="true" />
    <div class="flex items-center gap-2 px-4 py-3"><Boxes class="h-4 w-4 text-cyan-600" /><span class="text-sm font-medium text-cyan-900">{{ node.data?.label || '文件处理 / 沙箱' }}</span></div>
    <Handle type="source" :position="Position.Right" :connectable-start="true" :connectable-end="false" />
  </div>
</template>
