<template>
  <div class="space-y-6">
    <SectionCard title="文件与成果" description="上传文件，运行示例或 Python 任务，预览并下载生成的结果。任务在离开页面后仍会继续执行。">
      <p class="text-sm text-muted" role="status">{{ status?.enabled ? (status.ready ? '执行服务已就绪' : '执行服务暂不可用，已提交任务会排队等待') : '当前环境尚未启用沙箱执行，文件上传和下载可正常使用' }}</p>
      <p v-if="error" class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
    </SectionCard>

    <div class="grid items-start gap-6 xl:grid-cols-2">
      <SectionCard title="文件" description="勾选本次任务使用的文件，最多 10 个。任务只能读取已选文件。">
        <label class="mb-4 block text-sm font-medium">
          {{ uploading ? '正在上传…' : `上传文件（单个不超过 ${formatBytes(status?.maxFileBytes ?? 20971520)}）` }}
          <input class="mt-2 block w-full rounded-xl border border-line p-2" type="file" :disabled="uploading" @change="upload" />
        </label>
        <div v-if="files.length" class="space-y-3">
          <div v-for="file in files" :key="file.id" class="flex items-start gap-3">
            <input :id="`file-${file.id}`" v-model="selectedFiles" type="checkbox" :value="file.id" :disabled="!selectedFiles.includes(file.id) && selectedFiles.length >= 10" class="mt-4" :aria-label="`选择 ${file.name}`" />
            <ArtifactCard :file="file" class="min-w-0 flex-1" @preview="preview" @download="download" />
          </div>
        </div>
        <p v-else class="py-6 text-sm text-muted">还没有文件。上传文件，或运行示例任务生成首份成果。</p>
        <div class="mt-4 flex items-center justify-between text-sm">
          <UiButton variant="ghost" :disabled="filePage === 0" @click="changeFilePage(-1)">上一页</UiButton>
          <span>{{ filePage + 1 }} / {{ Math.max(1, filePages) }}</span>
          <UiButton variant="ghost" :disabled="filePage + 1 >= filePages" @click="changeFilePage(1)">下一页</UiButton>
        </div>
      </SectionCard>

      <div class="space-y-6">
        <SectionCard title="新建任务">
          <form class="space-y-4" @submit.prevent="submit">
            <label class="block text-sm font-medium">任务类型
              <select v-model="operation" class="mt-2 block w-full rounded-xl border border-line bg-white p-3">
                <option value="DEMO">示例任务：生成文件清单和结果文本</option>
                <option value="PYTHON">Python 执行</option>
                <option value="SQL">SQL 分析</option>
                <option value="PDF_EXTRACT">PDF 文本提取</option>
                <option value="PDF_SPLIT">PDF 拆分</option>
                <option value="PDF_MERGE">PDF 合并</option>
                <option value="PDF_RENDER">PDF 转图片</option>
                <option value="OFFICE_CONVERT">Office 文件转换</option>
                <option value="TABLE_INSPECT">Excel / CSV 检查</option>
                <option value="TABLE_ANALYZE">Excel / CSV 分析</option>
              </select>
            </label>
            <label v-if="operation === 'PYTHON' || operation === 'SQL'" class="block text-sm font-medium">{{ operation === 'SQL' ? 'SQL 查询' : 'Python 代码' }}
              <textarea v-model="code" rows="12" maxlength="100000" spellcheck="false" class="mt-2 block w-full rounded-xl border border-line bg-slate-950 p-4 font-mono text-xs text-slate-100" />
              <span class="mt-2 block text-xs leading-5 text-muted">从 /input 读取文件，将交付结果写入 /output。/workspace 可存放中间文件，执行环境默认断网。输入文件在任务详情中显示实际名称。</span>
            </label>
            <label v-if="!['DEMO', 'PYTHON'].includes(operation)" class="block text-sm font-medium">处理参数（JSON）
              <textarea v-model="argumentsJson" rows="4" spellcheck="false" class="mt-2 block w-full rounded-xl border border-line p-3 font-mono text-xs" aria-label="处理参数" />
              <span class="mt-1 block text-xs leading-5 text-muted">{{ argumentsHint }}</span>
            </label>
            <label class="block text-sm font-medium">超时（秒）
              <input v-model.number="timeoutSeconds" type="number" min="1" max="300" step="1" required class="mt-2 block w-full rounded-xl border border-line p-3" />
            </label>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-muted">已选择 {{ selectedFiles.length }} 个文件</span>
              <UiButton type="submit" :disabled="submitting || !status?.enabled">{{ submitting ? '正在提交…' : '运行任务' }}</UiButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="任务记录">
          <div class="mb-3 flex justify-end"><UiButton variant="ghost" :disabled="refreshing" @click="refresh">刷新</UiButton></div>
          <button v-for="task in tasks" :key="task.id" type="button" class="mb-2 block w-full rounded-xl border p-3 text-left" :class="selectedTaskId === task.id ? 'border-accent bg-accent-soft' : 'border-line'" @click="selectTask(task.id)">
            <div class="flex justify-between gap-2 text-sm"><strong>{{ operationLabel(task.operation) }}</strong><span>{{ stateLabel(task.status) }}{{ task.cancelRequested && !terminal(task.status) ? ' · 正在取消' : '' }}</span></div>
            <div class="mt-1 text-xs text-muted">{{ new Date(task.createdAt).toLocaleString() }}</div>
          </button>
          <p v-if="!tasks.length" class="py-4 text-sm text-muted">暂无任务记录。</p>
          <div class="mt-4 flex items-center justify-between text-sm">
            <UiButton variant="ghost" :disabled="taskPage === 0" @click="changeTaskPage(-1)">上一页</UiButton>
            <span>{{ taskPage + 1 }} / {{ Math.max(1, taskPages) }}</span>
            <UiButton variant="ghost" :disabled="taskPage + 1 >= taskPages" @click="changeTaskPage(1)">下一页</UiButton>
          </div>
        </SectionCard>
      </div>
    </div>

    <SectionCard v-if="detail" title="任务详情">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div><strong>{{ stateLabel(detail.task.status) }}</strong><p class="mt-1 break-all text-xs text-muted">{{ detail.task.id }}</p></div>
        <UiButton v-if="!terminal(detail.task.status)" variant="secondary" :disabled="cancelling || detail.task.cancelRequested" @click="cancel">{{ detail.task.cancelRequested ? '正在取消…' : '取消任务' }}</UiButton>
      </div>
      <p v-if="detail.task.errorMessage" class="mt-3 text-sm text-red-700">{{ detail.task.errorMessage }} <span v-if="detail.task.errorCode">（{{ detail.task.errorCode }}）</span></p>
      <div v-if="detail.inputs.length" class="mt-4 rounded-xl bg-canvas p-3 text-xs">
        <p class="font-semibold">本次输入</p><p v-for="input in detail.inputs" :key="input.fileId" class="mt-1 break-all">{{ input.originalName }} → /input/{{ input.inputName }}</p>
      </div>
      <div class="mt-4 flex flex-wrap gap-5 text-sm text-muted">
        <span>退出码：{{ detail.execution.exit_code ?? '—' }}</span>
        <span>耗时：{{ detail.execution.resource_usage.wallTimeMs ?? 0 }} ms</span>
        <span>CPU：{{ ((detail.execution.resource_usage.cpuTimeNanos ?? 0) / 1e9).toFixed(3) }} s</span>
        <span>采样峰值内存：{{ formatBytes(detail.execution.resource_usage.sampledPeakMemoryBytes ?? 0) }}</span>
        <span v-if="detail.execution.oom_killed" class="text-red-700">内存超限</span>
      </div>
      <div class="mt-5 grid gap-4 lg:grid-cols-2">
        <div v-for="stream in streams" :key="stream.key"><p class="mb-2 text-sm font-semibold">{{ stream.key }}{{ stream.truncated ? '（已截断）' : '' }}</p><pre class="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{{ stream.text || '暂无输出' }}</pre></div>
      </div>
      <div v-if="detail.artifacts.length" class="mt-5 grid gap-3 md:grid-cols-2"><ArtifactCard v-for="file in detail.artifacts" :key="file.id" :file="file" @preview="preview" @download="download" /></div>
      <p v-else-if="terminal(detail.task.status)" class="mt-5 text-sm text-muted">本次任务没有可交付文件。</p>
    </SectionCard>

    <FilePreviewDialog v-if="previewAsset" :key="previewAsset.id" :file="previewAsset" @close="closePreview" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import ArtifactCard from "@/app/components/files/ArtifactCard.vue";
import FilePreviewDialog from "@/app/components/files/FilePreviewDialog.vue";
import { cancelSandboxTask, createSandboxTask, downloadFileAsset, getSandboxTask, listFiles, listSandboxTasks, sandboxStatus, uploadFile } from "@/app/services/files";
import { extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";
import type { FileAsset, SandboxOperation, SandboxStatus, SandboxTask, SandboxTaskDetail } from "@/app/types/files";

const files = ref<FileAsset[]>([]), tasks = ref<SandboxTask[]>([]), selectedFiles = ref<string[]>([]);
const status = ref<SandboxStatus | null>(null), detail = ref<SandboxTaskDetail | null>(null);
const filePage = ref(0), filePages = ref(0), taskPage = ref(0), taskPages = ref(0);
const selectedTaskId = ref<string | null>(null), error = ref("");
const uploading = ref(false), submitting = ref(false), cancelling = ref(false), refreshing = ref(false);
const operation = ref<SandboxOperation>("DEMO"), timeoutSeconds = ref(120), argumentsJson = ref("{}");
const pythonCode = ref(`from pathlib import Path
import json

inputs = [{"name": p.name, "sizeBytes": p.stat().st_size}
          for p in Path('/input').iterdir()]
Path('/output/result.json').write_text(
    json.dumps({"inputs": inputs, "message": "任务已完成"}, ensure_ascii=False, indent=2),
    encoding='utf-8')
print('结果已写入 /output/result.json')
`);
const sqlCode = ref("SELECT * FROM input_1 LIMIT 100");
const code = computed({ get: () => operation.value === "SQL" ? sqlCode.value : pythonCode.value, set: (value: string) => { if (operation.value === "SQL") sqlCode.value = value; else pythonCode.value = value; } });
const argumentsHint = computed(() => ({ PDF_EXTRACT: '{"pages":[1,2]}，省略时提取所有页', PDF_SPLIT: '{"ranges":[[1,2],[3,4]]}', PDF_RENDER: '{"pages":[1],"dpi":120}', PDF_MERGE: '按勾选顺序合并文件', OFFICE_CONVERT: '{"format":"pdf"}', TABLE_INSPECT: '{"sheet":0,"encoding":"utf-8-sig"}', TABLE_ANALYZE: '{"groupBy":["category"],"aggregations":{"amount":"sum"}}', SQL: '表名依勾选顺序为 input_1、input_2；可设置 sheet、encoding、separator' } as Record<string,string>)[operation.value] ?? "{}");
function operationLabel(value: string) { return ({DEMO:"示例任务",PYTHON:"Python 任务",SQL:"SQL 分析",PDF_EXTRACT:"PDF 提取",PDF_SPLIT:"PDF 拆分",PDF_MERGE:"PDF 合并",PDF_RENDER:"PDF 渲染",OFFICE_CONVERT:"Office 转换",TABLE_INSPECT:"表格检查",TABLE_ANALYZE:"表格分析"} as Record<string,string>)[value] ?? value; }
const previewAsset = ref<FileAsset | null>(null);
const controller = new AbortController();
let timer: ReturnType<typeof setTimeout> | undefined;
let disposed = false, requestKey = "", requestFingerprint = "";
const streams = computed(() => detail.value ? [
  { key: "stdout", text: detail.value.execution.stdout, truncated: detail.value.execution.stdout_truncated },
  { key: "stderr", text: detail.value.execution.stderr, truncated: detail.value.execution.stderr_truncated }
] : []);
function terminal(state: string) { return ["SUCCEEDED", "FAILED", "TIMED_OUT", "CANCELLED"].includes(state); }
function stateLabel(state: string) { return ({ QUEUED: "排队中", PREPARING: "准备中", RUNNING: "执行中", COLLECTING: "收集成果中", SUCCEEDED: "已完成", FAILED: "失败", TIMED_OUT: "已超时", CANCELLED: "已取消" } as Record<string, string>)[state] ?? state; }
function formatBytes(bytes: number) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`; }
function report(reason: unknown) { if (!disposed && !isRequestCanceled(reason)) error.value = extractApiErrorMessage(reason, "操作失败，请稍后重试"); }
async function loadFiles() {
  const page = filePage.value;
  const result = await listFiles(page, controller.signal);
  if (!disposed && page === filePage.value) { files.value = result.items; filePages.value = result.totalPages; }
}
async function refresh() {
  if (refreshing.value || disposed) return;
  refreshing.value = true;
  try {
    const page = taskPage.value;
    const result = await listSandboxTasks(page, controller.signal);
    if (!disposed && page === taskPage.value) { tasks.value = result.items; taskPages.value = result.totalPages; }
    if (selectedTaskId.value) await loadDetail(selectedTaskId.value);
    await loadFiles();
  } catch (reason) { report(reason); }
  finally { refreshing.value = false; }
}
async function loadDetail(id: string) {
  const result = await getSandboxTask(id, controller.signal);
  if (!disposed && selectedTaskId.value === id) detail.value = result;
}
async function selectTask(id: string) { selectedTaskId.value = id; detail.value = null; try { await loadDetail(id); } catch (reason) { report(reason); } }
async function upload(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0];
  if (!file) return;
  error.value = "";
  if (file.size > (status.value?.maxFileBytes ?? 20971520)) { error.value = "文件超过上传限制"; input.value = ""; return; }
  uploading.value = true;
  try { const saved = await uploadFile(file); if (disposed) return; if (selectedFiles.value.length < 10) selectedFiles.value.push(saved.id); filePage.value = 0; await loadFiles(); }
  catch (reason) { report(reason); } finally { uploading.value = false; input.value = ""; }
}
async function submit() {
  error.value = ""; submitting.value = true;
  let options: Record<string, unknown>;
  try { options = JSON.parse(argumentsJson.value); if (!options || Array.isArray(options) || typeof options !== "object") throw new Error(); }
  catch { error.value = "处理参数必须是 JSON 对象"; submitting.value = false; return; }
  const payload = { operation: operation.value, code: ["PYTHON", "SQL"].includes(operation.value) ? code.value : "", fileIds: [...selectedFiles.value], timeoutSeconds: timeoutSeconds.value, arguments: options };
  const fingerprint = JSON.stringify(payload);
  if (fingerprint !== requestFingerprint || !requestKey) { requestFingerprint = fingerprint; requestKey = crypto.randomUUID(); }
  try { const task = await createSandboxTask(payload, requestKey); requestKey = ""; if (disposed) return; taskPage.value = 0; await selectTask(task.id); await refresh(); }
  catch (reason) { report(reason); } finally { submitting.value = false; }
}
async function cancel() {
  if (!detail.value) return;
  cancelling.value = true;
  try { await cancelSandboxTask(detail.value.task.id); await refresh(); } catch (reason) { report(reason); } finally { cancelling.value = false; }
}
async function changeFilePage(delta: number) { filePage.value += delta; try { await loadFiles(); } catch (reason) { report(reason); } }
async function changeTaskPage(delta: number) { taskPage.value += delta; await refresh(); }
async function download(file: FileAsset) {
  try { await downloadFileAsset(file); } catch (reason) { report(reason); }
}
function closePreview() { previewAsset.value = null; }
function preview(file: FileAsset) { previewAsset.value = file; }
async function tick() { await refresh(); if (!disposed) timer = setTimeout(tick, 3000); }
onMounted(async () => {
  try { status.value = await sandboxStatus(); timeoutSeconds.value = status.value.defaultTimeoutSeconds; } catch (reason) { report(reason); }
  if (!disposed) void tick();
});
onUnmounted(() => { disposed = true; controller.abort(); if (timer) clearTimeout(timer); closePreview(); });
</script>
