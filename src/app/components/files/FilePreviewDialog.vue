<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5" role="dialog" aria-modal="true" :aria-label="`预览 ${file.name}`" @click.self="$emit('close')">
    <div class="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white p-5">
      <div class="mb-4 flex items-center justify-between gap-3"><strong class="break-all">{{ file.name }}</strong><UiButton ref="closeButton" variant="ghost" @click="$emit('close')">关闭</UiButton></div>
      <p v-if="loading" class="p-8 text-sm text-muted" role="status">{{ preparing ? '正在生成预览，任务会在后台继续执行…' : '正在读取预览…' }}</p>
      <p v-else-if="error" class="p-6 text-sm text-red-700" role="alert">{{ error }}</p>
      <div v-else-if="table" class="overflow-auto"><table class="w-full border-collapse text-left text-xs"><thead><tr><th v-for="column in columns" :key="column" class="border border-line bg-canvas p-2">{{ column }}</th></tr></thead><tbody><tr v-for="(row, index) in table" :key="index"><td v-for="column in columns" :key="column" class="max-w-64 break-words border border-line p-2">{{ row[column] }}</td></tr></tbody></table><p class="mt-3 text-xs text-muted">仅展示前 20 行、50 列，请下载原文件查看完整数据。</p></div>
      <pre v-else-if="data?.kind === 'text'" class="overflow-auto whitespace-pre-wrap break-all rounded-xl bg-canvas p-4 text-sm">{{ data.text }}{{ data.truncated ? '\n\n…预览已截断，请下载完整文件。' : '' }}</pre>
      <img v-else-if="url && mediaType.startsWith('image/')" :src="url" :alt="file.name" class="min-h-0 object-contain" />
      <iframe v-else-if="url" :src="url" :title="file.name" class="h-[70vh] w-full" />
      <p v-else class="p-8 text-sm text-muted">此文件暂不支持在线预览，请下载后打开。</p>
      <div class="mt-4"><UiButton variant="secondary" @click="download">下载原文件</UiButton></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import { createSandboxTask, downloadFileAsset, fileBlob, getSandboxTask, previewFile } from "@/app/services/files";
import { extractApiErrorMessage } from "@/app/services/http";
import type { FileAsset, FilePreview } from "@/app/types/files";
const props = defineProps<{ file: FileAsset }>();
const emit = defineEmits<{ close: [] }>();
const closeButton = ref<{ $el: HTMLButtonElement } | null>(null);
const loading = ref(true), preparing = ref(false), error = ref(""), url = ref(""), mediaType = ref("");
const data = ref<FilePreview | null>(null), table = ref<Record<string, unknown>[] | null>(null);
const columns = computed(() => table.value?.length ? Object.keys(table.value[0]!).slice(0, 50) : []);
let disposed = false;
async function load() {
  try {
    const preview = await previewFile(props.file.id);
    if (disposed) return;
    data.value = preview;
    if (preview.kind === "prepare" && preview.operation) {
      preparing.value = true;
      const task = await createSandboxTask({ operation: preview.operation, fileIds: [props.file.id], timeoutSeconds: 300, arguments: preview.operation === "OFFICE_CONVERT" ? { format: "pdf" } : {} }, `preview-${props.file.id}-${preview.operation}`);
      const deadline = Date.now() + 480_000;
      while (!disposed && Date.now() < deadline) {
        const result = await getSandboxTask(task.id);
        if (result.task.status === "SUCCEEDED") {
          if (preview.operation === "TABLE_INSPECT") {
            const summary = result.artifacts.find(file => file.name === "summary.json");
            if (!summary) throw new Error("表格预览文件不存在");
            const blob = await fileBlob(summary.id);
            const parsed = JSON.parse(await blob.text()) as { preview: Record<string, unknown>[] };
            if (!disposed) table.value = parsed.preview.slice(0, 20);
          } else {
            const pdf = result.artifacts.find(file => file.mediaType === "application/pdf");
            if (!pdf) throw new Error("转换后的预览文件不存在");
            await binary(pdf);
          }
          return;
        }
        if (["FAILED", "CANCELLED", "TIMED_OUT"].includes(result.task.status)) throw new Error(result.task.errorMessage || "预览生成失败，请下载原文件查看");
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!disposed) throw new Error("预览仍在生成中，请稍后重新打开");
    } else if (preview.kind === "binary") await binary(props.file);
  } catch (reason) { if (!disposed) error.value = extractApiErrorMessage(reason, "预览失败，请下载原文件查看"); }
  finally { if (!disposed) loading.value = false; }
}
async function binary(file: FileAsset) { const blob = await fileBlob(file.id); if (!disposed) { mediaType.value = file.mediaType; url.value = URL.createObjectURL(blob); } }
async function download() { try { await downloadFileAsset(props.file); } catch (reason) { error.value = extractApiErrorMessage(reason); } }
function keydown(event: KeyboardEvent) { if (event.key === "Escape") emit("close"); }
onMounted(() => { closeButton.value?.$el.focus(); document.addEventListener("keydown", keydown); void load(); });
onUnmounted(() => { disposed = true; if (url.value) URL.revokeObjectURL(url.value); document.removeEventListener("keydown", keydown); });
</script>
