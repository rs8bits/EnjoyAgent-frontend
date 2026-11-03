<template>
  <article class="rounded-2xl border border-line bg-canvas p-4">
    <div class="break-all font-semibold text-ink">{{ file.name }}</div>
    <p class="mt-1 break-all text-xs text-muted">{{ file.mediaType }} · {{ formatBytes(file.sizeBytes) }}</p>
    <p v-if="file.stepKey" class="mt-1 text-xs text-muted">生成步骤：{{ file.stepKey }}</p>
    <details class="mt-2 text-xs text-muted"><summary class="cursor-pointer">文件校验信息</summary><code class="mt-1 block break-all">SHA-256: {{ file.sha256 }}</code></details>
    <div class="mt-3 flex gap-2">
      <UiButton variant="secondary" @click="$emit('preview', file)">预览</UiButton>
      <UiButton variant="ghost" @click="$emit('download', file)">下载</UiButton>
    </div>
  </article>
</template>

<script setup lang="ts">
import UiButton from "@/app/components/ui/UiButton.vue";
import type { FileAsset } from "@/app/types/files";
defineProps<{ file: FileAsset }>();
defineEmits<{ preview: [file: FileAsset]; download: [file: FileAsset] }>();
function formatBytes(value: number) {
  return value >= 1048576 ? `${(value / 1048576).toFixed(1)} MB` : value >= 1024 ? `${(value / 1024).toFixed(1)} KB` : `${value} B`;
}
</script>
