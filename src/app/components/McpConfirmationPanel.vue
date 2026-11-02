<script setup lang="ts">
import { ref, watch } from "vue";
import { http, extractApiErrorMessage } from "@/app/services/http";
import type { ApiResponse } from "@/app/types/api";
import type { McpConfirmation } from "@/app/types/chat";
const props = defineProps<{ sessionId?: number | null; proposals: McpConfirmation[]; refreshKey?: number }>();
const emit = defineEmits<{ resolved: [id: string] }>();
const cards = ref<McpConfirmation[]>([]);
const busy = ref<string | null>(null);
const error = ref("");
let generation = 0;
watch(() => [props.sessionId, props.refreshKey], async () => {
  const version = ++generation;
  cards.value = []; error.value = "";
  if (!props.sessionId) return;
  try {
    const result = await http.get<ApiResponse<McpConfirmation[]>>("/api/mcp/confirmations", { params: { sessionId: props.sessionId } });
    if (version === generation) {
      const all = new Map(result.data.data.map(item => [item.id, item]));
      for (const item of props.proposals) all.set(item.id, item);
      cards.value = [...all.values()];
    }
  } catch (e) { if (version === generation) error.value = extractApiErrorMessage(e, "加载待确认操作失败"); }
}, { immediate: true });
watch(() => props.proposals, (items) => {
  if (!props.sessionId) { cards.value = [...items]; return; }
  const all = new Map(cards.value.map(item => [item.id, item]));
  for (const item of items) all.set(item.id, item);
  cards.value = [...all.values()];
}, { deep: true, immediate: true });
async function resolve(card: McpConfirmation, action: "confirm" | "cancel") {
  busy.value = card.id; error.value = "";
  try {
    const response = await http.post<ApiResponse<{ status: string }>>(`/api/mcp/confirmations/${card.id}/${action}`);
    card.status = action === "cancel" ? "CANCELLED" : response.data.data.status;
    if (card.status === "EXECUTED") emit("resolved", card.id);
    else if (card.status === "FAILED") error.value = "工具报告执行失败，请核对外部系统。";
  } catch (e) { error.value = extractApiErrorMessage(e, "处理确认失败，请核对操作状态"); }
  finally { busy.value = null; }
}
</script>
<template>
  <div v-if="cards.length || error" class="mb-3 space-y-2">
    <div v-for="card in cards" :key="card.id" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
      <div class="font-semibold">确认操作：{{ card.toolName }}</div>
      <p class="my-1 text-xs text-muted">将使用以下冻结参数执行一次。请核对目标与影响；有效期至 {{ new Date(card.expiresAt).toLocaleString() }}。</p>
      <pre class="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 text-xs">{{ JSON.stringify(card.arguments, null, 2) }}</pre>
      <div v-if="card.status === 'PENDING'" class="mt-2 flex gap-2">
        <button type="button" class="rounded bg-accent px-3 py-1 text-white disabled:opacity-50" :disabled="busy !== null || Date.parse(card.expiresAt) <= Date.now()" @click="resolve(card, 'confirm')">确认执行</button>
        <button type="button" class="rounded border px-3 py-1 disabled:opacity-50" :disabled="busy !== null" @click="resolve(card, 'cancel')">取消</button>
      </div>
      <p v-else class="mt-2 text-xs">状态：{{ card.status }}</p>
    </div>
    <p v-if="error" class="text-xs text-rose-700" role="alert">{{ error }}</p>
  </div>
</template>
