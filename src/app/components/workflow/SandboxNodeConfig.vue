<template>
  <div class="space-y-4 text-xs">
    <label class="block">操作<select :value="config.operation ?? 'PYTHON'" class="mt-1 block w-full rounded border border-line p-2" @change="field('operation', ($event.target as HTMLSelectElement).value)"><option v-for="operation in operations" :key="operation" :value="operation">{{ operation }}</option></select></label>
    <label class="block">输入文件 ID / 上游产物变量<textarea v-model="filesDraft" rows="3" class="mt-1 block w-full rounded border border-line p-2 font-mono" placeholder='["file-id"] 或 {{sandbox_1.artifact_ids}}' @change="saveFiles" /></label>
    <label v-if="['PYTHON', 'SQL'].includes(String(config.operation ?? 'PYTHON'))" class="block">代码 / SQL<textarea :value="String(config.code ?? '')" rows="9" spellcheck="false" class="mt-1 block w-full rounded border border-line p-2 font-mono" @change="field('code', ($event.target as HTMLTextAreaElement).value)" /></label>
    <label class="block">处理参数（JSON）<textarea v-model="argumentsDraft" rows="5" class="mt-1 block w-full rounded border border-line p-2 font-mono" @change="saveArguments" /></label>
    <label class="block">超时（秒）<input type="number" min="1" max="300" :value="Number(config.timeoutSeconds ?? 120)" class="mt-1 block w-full rounded border border-line p-2" @change="field('timeoutSeconds', Number(($event.target as HTMLInputElement).value))" /></label>
    <p v-if="error" class="text-red-700" role="alert">{{ error }}</p>
    <p class="leading-5 text-muted">文件只读；Python 从 /input 读取，将交付文件写入 /output。可用 artifact_ids 将成果交给后续沙箱节点。</p>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
const props = defineProps<{ config: Record<string, unknown> }>();
const emit = defineEmits<{ change: [config: Record<string, unknown>] }>();
const operations = ['PYTHON', 'SQL', 'PDF_EXTRACT', 'PDF_SPLIT', 'PDF_MERGE', 'PDF_RENDER', 'OFFICE_CONVERT', 'TABLE_INSPECT', 'TABLE_ANALYZE'];
const filesDraft = ref(typeof props.config.fileIds === 'string' ? props.config.fileIds : JSON.stringify(props.config.fileIds ?? []));
const argumentsDraft = ref(JSON.stringify(props.config.arguments ?? {}, null, 2)), error = ref("");
function field(key: string, value: unknown) { emit('change', { ...props.config, [key]: value }); }
function saveFiles() { try { const value = /^\s*\{\{.+}}\s*$/.test(filesDraft.value) ? filesDraft.value.trim() : JSON.parse(filesDraft.value); if (!Array.isArray(value) && typeof value !== 'string') throw new Error(); field('fileIds', value); error.value = ''; } catch { error.value = '输入文件必须为 JSON 数组或完整变量引用'; } }
function saveArguments() { try { const value = JSON.parse(argumentsDraft.value); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); field('arguments', value); error.value = ''; } catch { error.value = '处理参数必须为 JSON 对象'; } }
</script>
