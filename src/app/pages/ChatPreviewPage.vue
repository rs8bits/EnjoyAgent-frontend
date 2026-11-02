<template>
  <div class="grid min-h-full gap-5 p-3 sm:p-5 lg:h-full lg:min-h-0 lg:grid-cols-[280px_minmax(0,1fr)_340px] lg:overflow-hidden lg:p-6">
    <SectionCard
      class="flex min-h-0 flex-col lg:h-full lg:overflow-hidden"
      eyebrow="会话"
      title="聊天工作台"
    >
      <div class="grid min-h-0 gap-4 lg:h-full lg:grid-rows-[auto_minmax(0,1fr)]">
        <div class="space-y-4">
          <form class="space-y-2" @submit.prevent="submitAgentSearch">
            <UiTextField
              v-model="agentSearchInput"
              label="搜索 Agent"
              placeholder="输入 Agent 名称"
            />
            <UiButton class="w-full" type="submit" variant="secondary" :disabled="agentsLoading">
              {{ agentsLoading ? "搜索中..." : "搜索" }}
            </UiButton>
          </form>

          <UiSelect
            v-model="selectedAgentId"
            label="当前 Agent"
            :options="agentOptions"
            placeholder="请选择一个 Agent"
            :disabled="agentsLoading"
            :hint="agentSelectorHint"
          />

          <UiPagination
            :page="agentPage"
            :size="agentPageSize"
            :total="agentTotal"
            :total-pages="agentTotalPages"
            @change="changeAgentPage"
          />

          <UiButton
            class="w-full"
            :disabled="creatingSession || !selectedAgentId"
            @click="createSessionForSelectedAgent"
          >
            {{ creatingSession ? "创建中..." : "新建会话" }}
          </UiButton>
        </div>

        <div v-if="sessionLoading" class="rounded-[18px] border border-line bg-canvas px-4 py-8 text-sm text-muted">
          正在加载会话列表...
        </div>

        <div v-else-if="!sessions.length" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
          还没有会话。先选择一个 Agent，再创建一条新会话开始聊天。
        </div>

        <div v-else class="ea-scroll max-h-96 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 lg:max-h-none">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="rounded-[20px] border px-4 py-4 text-left transition"
            :class="session.id === selectedSessionId ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
          >
            <div class="flex items-start justify-between gap-3">
              <button class="min-w-0 flex-1 text-left" @click="selectSession(session.id)">
                <div class="truncate text-sm font-semibold text-ink">{{ session.title }}</div>
                <div class="mt-1 text-sm text-muted">{{ session.agentName }}</div>
                <div class="mt-3 text-xs text-muted">{{ formatDateTime(session.updatedAt) }}</div>
              </button>
              <button
                class="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted transition hover:border-rose-200 hover:text-rose-500"
                :disabled="deletingSessionId === session.id"
                @click="removeSession(session.id, session.title)"
              >
                {{ deletingSessionId === session.id ? "删除中" : "删除" }}
              </button>
            </div>
          </div>

          <UiPagination
            :page="sessionPage"
            :size="sessionPageSize"
            :total="sessionTotal"
            :total-pages="sessionTotalPages"
            @change="loadSessions"
          />
        </div>
      </div>
    </SectionCard>

    <SectionCard class="flex min-h-0 flex-col lg:h-full lg:overflow-hidden" eyebrow="对话" title="聊天">
      <div v-if="!hasAnyAgent" class="flex h-full min-h-0 flex-col items-center justify-center rounded-[24px] border border-dashed border-line bg-canvas px-8 text-center">
        <div class="text-lg font-semibold text-ink">当前还没有可用 Agent</div>
        <div class="mt-2 max-w-md text-sm leading-6 text-muted">
          请先创建并配置一个 Agent。
        </div>
        <RouterLink
          v-if="authStore.isOwner"
          class="mt-6 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:brightness-105"
          to="/app/agents"
        >
          去创建 Agent
        </RouterLink>
        <div v-else class="mt-6 rounded-2xl border border-line bg-canvas px-4 py-3 text-sm text-muted">
          请联系工作区拥有者创建并配置 Agent。
        </div>
      </div>

      <div v-else-if="!selectedSessionId" class="flex h-full min-h-0 flex-col items-center justify-center rounded-[24px] border border-dashed border-line bg-canvas px-8 text-center">
        <div class="text-lg font-semibold text-ink">先创建一个新会话</div>
        <div class="mt-2 max-w-md text-sm leading-6 text-muted">
          选择 Agent，然后点击“新建会话”。
        </div>
      </div>

      <div v-else class="grid min-h-0 gap-5 lg:h-full lg:grid-rows-[auto_minmax(0,1fr)_auto_auto]">
        <div class="flex items-center justify-between gap-4 rounded-[20px] border border-line bg-canvas px-4 py-4">
          <div>
            <div class="text-base font-semibold text-ink">{{ activeSession?.title ?? "当前会话" }}</div>
            <div class="mt-1 text-sm text-muted">
              {{ activeSession?.agentName ?? activeAgent?.name }} · {{ activeSession ? formatDateTime(activeSession.updatedAt) : "尚未开始" }}
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              {{ streamStateLabel }}
            </span>
            <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-muted">
              {{ credentialSourceLabel(currentTurn?.credentialSource ?? streamStarted?.credentialSource) }}
            </span>
          </div>
        </div>

        <div class="ea-scroll max-h-[55vh] min-h-0 space-y-5 overflow-y-auto pr-1 lg:max-h-none">
          <div v-if="messagesLoading" class="rounded-[18px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
            正在加载消息历史...
          </div>

          <div v-else-if="!messages.length" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm text-muted">
            这条会话还没有任何消息。你可以在下方输入框直接开始提问。
          </div>

          <div
            v-for="message in messages"
            :key="message.id"
            class="flex gap-4"
            :class="isAssistantMessage(message.role) ? 'justify-start' : 'justify-end'"
          >
            <div
              class="max-w-[80%] rounded-[24px] px-5 py-4 text-sm leading-7 shadow-sm"
              :class="isAssistantMessage(message.role) ? 'border border-line bg-canvas text-ink' : 'bg-accent text-white'"
            >
              <div
                class="mb-2 text-xs font-semibold uppercase tracking-[0.18em]"
                :class="isAssistantMessage(message.role) ? 'text-muted' : 'text-white/80'"
              >
                {{ isAssistantMessage(message.role) ? "助手" : "用户" }}
              </div>
              <div class="whitespace-pre-wrap break-words"><template v-for="(part, index) in citationParts(message.content)" :key="index"><button v-if="part.chunkId" type="button" class="mx-1 text-accent underline" @click="openEvidence(part.chunkId)">{{ part.text }}</button><span v-else>{{ part.text }}</span></template></div>
              <div
                class="mt-3 text-xs"
                :class="isAssistantMessage(message.role) ? 'text-muted' : 'text-white/80'"
              >
                {{ formatDateTime(message.createdAt) }}
              </div>
            </div>
          </div>

          <UiPagination
            :page="messagePage"
            :size="messagePageSize"
            :total="messageTotal"
            :total-pages="messageTotalPages"
            @change="loadMessages"
          />
        </div>

        <div v-if="evidence || evidenceError" class="max-h-64 overflow-auto rounded-xl border border-line bg-white p-4 text-sm">
          <button type="button" class="float-right text-muted" @click="evidence = null; evidenceError = ''">关闭来源</button>
          <p v-if="evidenceError" role="alert">{{ evidenceError }}</p>
          <template v-if="evidence"><strong>{{ evidence.file_name }}</strong><p class="text-xs text-muted">{{ evidence.heading }} · 页码 {{ evidence.page_number ?? '未记录' }} · 字符 {{ evidence.source_start ?? '?' }}–{{ evidence.source_end ?? '?' }}</p><p v-for="paragraph in evidence.paragraphs" :key="paragraph.id" class="mt-3 whitespace-pre-wrap" :class="paragraph.id === evidence.id ? 'border-l-2 border-accent pl-2' : 'text-muted'">{{ paragraph.content }}</p></template>
        </div>
        <form class="shrink-0 rounded-[26px] border border-line bg-canvas p-4" @submit.prevent="submitMessage">
          <div class="rounded-[22px] border border-white bg-white px-4 py-4 shadow-sm">
            <McpConfirmationPanel :session-id="selectedSessionId" :proposals="confirmations" :refresh-key="confirmationRefresh" @resolved="continueConfirmedTurn" />
            <div v-if="executionEvents.length" class="mb-3 max-h-32 overflow-auto rounded-xl bg-canvas p-3 text-xs" aria-live="polite">
              <div v-for="event in executionEvents" :key="`${event.runId}:${event.sequence}`">{{ executionLabel(event) }}</div>
            </div>
            <textarea
              v-model="composer"
              rows="4"
              aria-label="聊天消息"
              placeholder="输入你的问题，让 Agent 检索知识、调用工具，或者解释一段业务流程。"
              class="w-full resize-none border-none bg-transparent text-sm leading-7 text-ink outline-none placeholder:text-muted/70"
            />
            <div class="mt-4 flex items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                <span class="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                  {{ activeAgent?.name ?? "未选 Agent" }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-muted">
                  {{ streamStarted?.mode === "EXECUTION" ? "任务执行" : "SSE 流式" }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-muted">
                  {{ currentTurn?.modelName ?? streamStarted?.modelName ?? "等待模型返回" }}
                </span>
              </div>
              <UiButton type="submit" :disabled="sending || !composer.trim() || !selectedSessionId">
                {{ sending ? "发送中..." : "发送" }}
              </UiButton>
            </div>
          </div>
          <div v-if="submitError" class="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
            {{ submitError }}
          </div>
        </form>
      </div>
    </SectionCard>

    <div class="ea-scroll min-h-0 space-y-5 lg:overflow-y-auto lg:pr-1">
      <SectionCard eyebrow="知识调试" title="检索命中">
        <div v-if="retrievalDebug?.hits?.length" class="space-y-3">
          <div
            v-for="hit in retrievalDebug.hits"
            :key="`${hit.chunkId}-${hit.chunkIndex}`"
            class="rounded-[20px] border border-line bg-canvas px-4 py-4"
          >
            <div class="text-sm font-semibold text-ink">{{ hit.documentName || `片段 ${hit.chunkIndex}` }}</div>
            <div class="mt-2 line-clamp-5 text-sm leading-6 text-muted">{{ hit.content }}</div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{{ hit.matchedBy || "检索命中" }}</span>
              <span>{{ scoreText(hit.rerankScore ?? hit.recallScore) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm text-muted">
          暂无知识检索记录。
        </div>
      </SectionCard>

      <SectionCard eyebrow="工具轨迹" title="最近工具调用">
        <div v-if="toolLogsLoading" class="rounded-[18px] border border-line bg-canvas px-4 py-8 text-sm text-muted">
          正在加载工具调用轨迹...
        </div>
        <div v-else-if="!toolCallLogs.length" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
          暂无工具调用记录。
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="log in toolCallLogs"
            :key="log.id"
            class="rounded-[20px] border border-line bg-canvas px-4 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-ink">{{ log.toolName }}</div>
                <div class="mt-1 text-xs text-muted">
                  {{ formatDateTime(log.createdAt) }}
                </div>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
              >
                {{ log.status === "SUCCESS" ? "成功" : "失败" }}
              </span>
            </div>
            <div class="mt-3 text-xs leading-5 text-muted">
              {{ log.latencyMs ? `${log.latencyMs} ms` : "无耗时" }}
              <span v-if="log.errorMessage"> · {{ log.errorMessage }}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="运行时" title="本轮调用信息">
        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
            <span class="text-muted">模型来源</span>
            <span class="font-semibold text-ink">{{ credentialSourceLabel(currentTurn?.credentialSource ?? streamStarted?.credentialSource) }}</span>
          </div>
          <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
            <span class="text-muted">模型名称</span>
            <span class="font-semibold text-ink">{{ currentTurn?.modelName ?? streamStarted?.modelName ?? "未开始" }}</span>
          </div>
          <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
            <span class="text-muted">流式模式</span>
            <span class="font-semibold text-ink">{{ streamStarted?.mode === "SYNC_FALLBACK" ? "同步回退" : streamStarted?.mode === "STREAM" ? "流式输出" : "未开始" }}</span>
          </div>
          <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
            <span class="text-muted">耗时</span>
            <span class="font-semibold text-ink">{{ currentTurn?.latencyMs ? `${currentTurn.latencyMs} ms` : "未完成" }}</span>
          </div>
          <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
            <span class="text-muted">总 Token</span>
            <span class="font-semibold text-ink">{{ totalTokensText }}</span>
          </div>
          <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
            <span class="text-muted">知识库</span>
            <span class="font-semibold text-ink">{{ retrievalDebug?.knowledgeBaseName ?? "未命中知识库" }}</span>
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import { usePaginatedAgentSelector } from "@/app/composables/usePaginatedAgentSelector";
import {
  ChatStreamError,
  createChatIdempotencyKey,
  createChatSession,
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  streamChatMessage
} from "@/app/services/chat";
import { http, extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";
import { listMcpToolCallLogs } from "@/app/services/mcp";
import { useAuthStore } from "@/app/stores/auth";
import type {
  ChatMessage,
  ChatSession,
  ChatStreamStarted,
  ChatTurn,
  KnowledgeRetrievalDebug
} from "@/app/types/chat";
import McpConfirmationPanel from "@/app/components/McpConfirmationPanel.vue";
import type { ApiResponse } from "@/app/types/api";
import type { ExecutionEvent, McpConfirmation } from "@/app/types/chat";
import type { McpToolCallLog } from "@/app/types/mcp";


const executionEvents = ref<ExecutionEvent[]>([]);
const confirmations = ref<McpConfirmation[]>([]);
const confirmationRefresh = ref(0);
interface Evidence { id: number; file_name: string; heading: string | null; page_number: number | null; source_start: number | null; source_end: number | null; paragraphs: { id: number; content: string }[] }
const evidence = ref<Evidence | null>(null);
const evidenceError = ref('');
function citationParts(text: string) {
  return text.split(/(\[来源:\d+\])/g).map(part => ({ text: part, chunkId: /^\[来源:(\d+)\]$/.exec(part)?.[1] }));
}
async function openEvidence(id: string) {
  const session = selectedSessionId.value;
  evidenceError.value = ''; evidence.value = null;
  try { const result = await http.get<ApiResponse<Evidence>>(`/api/knowledge/chunks/${id}`); if (selectedSessionId.value === session) evidence.value = result.data.data; }
  catch (e) { if (selectedSessionId.value === session) evidenceError.value = extractApiErrorMessage(e, '加载来源失败'); }
}
function executionLabel(event: ExecutionEvent) {
  const labels: Record<string, string> = { run_started: '开始执行', retrieval_started: '正在检索', retrieval_completed: '检索完成', model_started: '模型处理中', model_completed: '模型处理完成', tool_started: '开始调用工具', tool_completed: '工具执行完成', tool_failed: '工具执行失败', node_started: '节点开始', node_completed: '节点完成', node_failed: '节点失败', node_skipped: '跳过节点', confirmation_required: '等待操作确认', run_completed: '执行完成', heartbeat: '执行中' };
  return `${labels[event.type] ?? event.type} ${String(event.data.toolName ?? event.data.nodeName ?? '')}`;
}
async function continueConfirmedTurn() {
  if (pendingChatAttempt?.sessionId === selectedSessionId.value) { composer.value = pendingChatAttempt.content; await submitMessage(); }
  else submitError.value = '操作已执行，请继续提问。';
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const sessions = ref<ChatSession[]>([]);
const sessionPage = ref(0);
const sessionPageSize = 20;
const sessionTotal = ref(0);
const sessionTotalPages = ref(0);
const messages = ref<ChatMessage[]>([]);
const messagePage = ref(0);
const messagePageSize = 20;
const messageTotal = ref(0);
const messageTotalPages = ref(0);
const selectedAgentId = ref("");
const {
  activeAgent,
  agentOptions,
  agentPage,
  pageSize: agentPageSize,
  agentTotal,
  agentTotalPages,
  agentSearchInput,
  appliedAgentSearch,
  agentsLoading,
  hasAnyAgent,
  initializeAgents,
  loadAgentPage,
  searchAgents,
  disposeAgentSelector
} = usePaginatedAgentSelector(selectedAgentId, {
  formatLabel: (agent) => `${agent.name} · ${agent.chatModelBindingType === "OFFICIAL_MODEL" ? "官方模型" : "用户模型"}`
});
const selectedSessionId = ref<number | null>(null);
const creatingSession = ref(false);
const loading = ref(false);
const sessionLoading = ref(false);
const messagesLoading = ref(false);
const sending = ref(false);
const deletingSessionId = ref<number | null>(null);
const composer = ref("");
const submitError = ref("");
const currentTurn = ref<ChatTurn | null>(null);
const retrievalDebug = ref<KnowledgeRetrievalDebug | null>(null);
const streamStarted = ref<ChatStreamStarted | null>(null);
const streamingAssistantId = ref<number | null>(null);
const toolCallLogs = ref<McpToolCallLog[]>([]);
const toolLogsLoading = ref(false);
let sessionLoadController: AbortController | null = null;
let messageLoadController: AbortController | null = null;
let toolLogController: AbortController | null = null;
let streamController: AbortController | null = null;
let workspaceLoadController: AbortController | null = null;
let deltaFrame: number | null = null;
let pendingDelta = "";
let initializingWorkspace = true;
let agentSwitchVersion = 0;
let switchingAgent = false;
let componentActive = false;
interface PendingChatAttempt {
  sessionId: number;
  agentId: number;
  content: string;
  payload: { content: string; toolApprovalTokens?: string[] };
  idempotencyKey: string;
}
let pendingChatAttempt: PendingChatAttempt | null = null;

const activeSession = computed(() =>
  sessions.value.find((session) => session.id === selectedSessionId.value) ?? null
);

const agentSelectorHint = computed(() => appliedAgentSearch.value
  ? `搜索“${appliedAgentSearch.value}”共 ${agentTotal.value} 条；已选 Agent 会在切页后保留。`
  : hasAnyAgent.value
    ? `共 ${agentTotal.value} 个 Agent，每页 ${agentPageSize} 个。`
    : "当前还没有 Agent，请先去 Agent 管理页面创建。"
);

const streamStateLabel = computed(() => {
  if (sending.value) {
    return "正在生成";
  }
  if (streamStarted.value?.mode === "EXECUTION") {
    return "任务执行完成";
  }
  if (streamStarted.value?.mode === "STREAM") {
    return "流式完成";
  }
  return "等待提问";
});

const totalTokensText = computed(() => {
  if (!currentTurn.value) {
    return "未完成";
  }
  if (currentTurn.value.totalTokens !== null && currentTurn.value.totalTokens !== undefined) {
    return String(currentTurn.value.totalTokens);
  }
  return "未返回";
});

function isAssistantMessage(role: string) {
  return role === "ASSISTANT";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "未知时间";
  }
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function credentialSourceLabel(source: string | null | undefined) {
  if (source === "PLATFORM") {
    return "官方模型";
  }
  if (source === "USER") {
    return "用户模型";
  }
  return "未开始";
}

function scoreText(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "无分数";
  }
  return score.toFixed(2);
}

async function loadAgentsAndSessions(signal?: AbortSignal) {
  loading.value = true;
  submitError.value = "";
  try {
    const queryAgentId = typeof route.query.agentId === "string" ? route.query.agentId : "";
    const querySessionId = typeof route.query.sessionId === "string" ? Number(route.query.sessionId) : null;
    const preferredAgentId = queryAgentId && Number.isFinite(Number(queryAgentId))
      ? Number(queryAgentId)
      : undefined;
    await initializeAgents(preferredAgentId, signal);
    if (signal?.aborted) return;

    await loadSessions();
    if (signal?.aborted) return;

    if (querySessionId && sessions.value.some((session) => session.id === querySessionId)) {
      selectedSessionId.value = querySessionId;
    } else if (!selectedSessionId.value && sessions.value.length) {
      selectedSessionId.value = sessions.value[0].id;
    }
  } catch (error) {
    if (!isRequestCanceled(error)) {
      submitError.value = extractApiErrorMessage(error, "加载聊天工作台失败");
    }
  } finally {
    if (!signal?.aborted) {
      loading.value = false;
    }
  }
}

async function submitAgentSearch() {
  submitError.value = "";
  try {
    await searchAgents();
  } catch (error) {
    if (!isRequestCanceled(error)) {
      submitError.value = extractApiErrorMessage(error, "搜索 Agent 失败");
    }
  }
}

async function changeAgentPage(page: number) {
  submitError.value = "";
  try {
    await loadAgentPage(page);
  } catch (error) {
    if (!isRequestCanceled(error)) {
      submitError.value = extractApiErrorMessage(error, "加载 Agent 分页失败");
    }
  }
}

async function loadSessions(newPage?: number) {
  if (newPage !== undefined) sessionPage.value = newPage;
  sessionLoadController?.abort();
  const controller = new AbortController();
  sessionLoadController = controller;
  const requestedAgentId = selectedAgentId.value;
  const requestedPage = sessionPage.value;
  sessionLoading.value = true;
  try {
    const agentId = requestedAgentId ? Number(requestedAgentId) : undefined;
    const result = await listChatSessions(agentId, requestedPage, sessionPageSize, controller.signal);
    if (controller.signal.aborted || requestedAgentId !== selectedAgentId.value || requestedPage !== sessionPage.value) {
      return;
    }
    sessions.value = result.items;
    sessionTotal.value = result.total;
    sessionTotalPages.value = result.totalPages;
    if (selectedSessionId.value && !sessions.value.some((session) => session.id === selectedSessionId.value)) {
      selectedSessionId.value = sessions.value[0]?.id ?? null;
    }
  } catch (error) {
    if (!isRequestCanceled(error)) {
      submitError.value = extractApiErrorMessage(error, "加载会话列表失败");
    }
  } finally {
    if (sessionLoadController === controller) {
      sessionLoading.value = false;
      sessionLoadController = null;
    }
  }
}

async function loadMessages(newPage?: number) {
  if (newPage !== undefined) messagePage.value = newPage;
  if (!selectedSessionId.value) {
    messages.value = [];
    return;
  }

  messageLoadController?.abort();
  const controller = new AbortController();
  messageLoadController = controller;
  const requestedSessionId = selectedSessionId.value;
  const requestedPage = messagePage.value;
  messagesLoading.value = true;
  try {
    const result = await listChatMessages(requestedSessionId, requestedPage, messagePageSize, controller.signal);
    if (controller.signal.aborted || requestedSessionId !== selectedSessionId.value || requestedPage !== messagePage.value) {
      return;
    }
    messages.value = result.items;
    messageTotal.value = result.total;
    messageTotalPages.value = result.totalPages;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      submitError.value = extractApiErrorMessage(error, "加载消息历史失败");
    }
  } finally {
    if (messageLoadController === controller) {
      messagesLoading.value = false;
      messageLoadController = null;
    }
  }
}

async function loadToolCallLogs() {
  if (!selectedSessionId.value) {
    toolCallLogs.value = [];
    return;
  }

  toolLogController?.abort();
  const controller = new AbortController();
  toolLogController = controller;
  const requestedSessionId = selectedSessionId.value;
  toolLogsLoading.value = true;
  try {
    const logs = await listMcpToolCallLogs({
      sessionId: requestedSessionId,
      limit: 12
    }, controller.signal);
    if (controller.signal.aborted || requestedSessionId !== selectedSessionId.value) {
      return;
    }
    toolCallLogs.value = logs;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      submitError.value = extractApiErrorMessage(error, "加载工具调用轨迹失败");
    }
  } finally {
    if (toolLogController === controller) {
      toolLogsLoading.value = false;
      toolLogController = null;
    }
  }
}

async function createSessionForSelectedAgent() {
  if (!selectedAgentId.value) {
    submitError.value = "请先选择一个 Agent。";
    return;
  }

  creatingSession.value = true;
  submitError.value = "";
  try {
    const session = await createChatSession({
      agentId: Number(selectedAgentId.value)
    });
    sessionPage.value = 0;
    await loadSessions();
    selectedSessionId.value = session.id;
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "创建会话失败");
  } finally {
    creatingSession.value = false;
  }
}

async function removeSession(sessionId: number, title: string) {
  if (deletingSessionId.value || !window.confirm(`确定删除会话“${title}”吗？消息历史和本轮调试信息都会一起移除。`)) {
    return;
  }

  deletingSessionId.value = sessionId;
  submitError.value = "";
  try {
    await deleteChatSession(sessionId);
    if (selectedSessionId.value === sessionId) {
      selectedSessionId.value = null;
      messages.value = [];
      currentTurn.value = null;
      retrievalDebug.value = null;
      streamStarted.value = null;
      toolCallLogs.value = [];
    }
    sessionPage.value = 0;
    await loadSessions();
    if (!selectedSessionId.value && sessions.value.length) {
      selectedSessionId.value = sessions.value[0].id;
    }
    if (selectedSessionId.value) {
      await loadMessages();
      await loadToolCallLogs();
    }
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "删除会话失败");
  } finally {
    deletingSessionId.value = null;
  }
}

function selectSession(sessionId: number) {
  if (selectedSessionId.value !== sessionId) {
    streamController?.abort();
  }
  selectedSessionId.value = sessionId;
  currentTurn.value = null;
  retrievalDebug.value = null;
  streamStarted.value = null;
  toolCallLogs.value = [];
}

function clearFailedStreamingAssistant(sessionId: number) {
  if (deltaFrame !== null) {
    window.cancelAnimationFrame(deltaFrame);
    deltaFrame = null;
  }
  pendingDelta = "";
  const assistantId = streamingAssistantId.value;
  if (assistantId && selectedSessionId.value === sessionId) {
    messages.value = messages.value.filter((message) => message.id !== assistantId);
  }
  streamingAssistantId.value = null;
}

async function submitMessage() {
  if (!selectedSessionId.value || !composer.value.trim() || sending.value) {
    return;
  }

  const sessionId = selectedSessionId.value;
  const agentId = Number(selectedAgentId.value);
  const submittedContent = composer.value.trim();
  const canRetryPreviousAttempt = pendingChatAttempt?.sessionId === sessionId
    && pendingChatAttempt.agentId === agentId
    && pendingChatAttempt.content === submittedContent;
  if (!canRetryPreviousAttempt) {
    pendingChatAttempt = {
      sessionId,
      agentId,
      content: submittedContent,
      payload: {
        content: submittedContent,

      },
      idempotencyKey: createChatIdempotencyKey(),
    };
  }
  const attempt = pendingChatAttempt;
  if (!attempt) return;
  streamController?.abort();
  if (deltaFrame !== null) {
    window.cancelAnimationFrame(deltaFrame);
    deltaFrame = null;
  }
  pendingDelta = "";
  const controller = new AbortController();
  streamController = controller;
  sending.value = true;
  submitError.value = "";
  currentTurn.value = null;
  retrievalDebug.value = null;
  streamStarted.value = null;
  streamingAssistantId.value = null;
  executionEvents.value = [];
  sessionStorage.setItem('enjoy.pendingChat', JSON.stringify(attempt));

  try {
    while (!controller.signal.aborted) {
      try {
        await streamChatMessage(
          sessionId,
          attempt.payload,
          {
            onExecution(event) {
              if (selectedSessionId.value !== sessionId) return;
              executionEvents.value = [...executionEvents.value, event].slice(-100);
              if (event.type === 'confirmation_required') confirmations.value = [event.data as unknown as McpConfirmation];
            },
            onStarted(event) {
              if (event.sessionId !== sessionId || selectedSessionId.value !== sessionId) return;
              streamStarted.value = event;
              const userMessage: ChatMessage = {
                id: event.userMessageId,
                sessionId: event.sessionId,
                role: "USER",
                content: event.userMessageContent,
                createdAt: new Date().toISOString()
              };
              const tempAssistantId = -Date.now();
              const previousAssistantId = streamingAssistantId.value;
              streamingAssistantId.value = tempAssistantId;
              messages.value = [
                ...messages.value.filter(
                  (message) => message.id !== event.userMessageId && message.id !== previousAssistantId
                ),
                userMessage,
                {
                  id: tempAssistantId,
                  sessionId: event.sessionId,
                  role: "ASSISTANT",
                  content: "",
                  createdAt: new Date().toISOString()
                }
              ];
            },
            onRetrieval(event) {
              if (selectedSessionId.value !== sessionId) return;
              retrievalDebug.value = event;
            },
            onDelta(event) {
              if (selectedSessionId.value !== sessionId || !streamingAssistantId.value) return;
              pendingDelta += event.delta;
              if (deltaFrame === null) {
                deltaFrame = window.requestAnimationFrame(flushPendingDelta);
              }
            },
            onCompleted(event) {
              if (selectedSessionId.value !== sessionId) return;
              flushPendingDelta();
              currentTurn.value = event;
              retrievalDebug.value = event.retrievalDebug;
              messages.value = messages.value
                .filter((message) => message.id !== streamingAssistantId.value && message.id !== event.userMessage.id)
                .concat([event.userMessage, event.assistantMessage]);
              streamingAssistantId.value = null;
            },
            onError(error) {
              if (selectedSessionId.value === sessionId && error.code !== 'MCP_ACTION_CONFIRMATION_REQUIRED' ) {
                submitError.value = error.message;
              }
            }
          },
          {
            signal: controller.signal,
            idempotencyKey: attempt.idempotencyKey
          }
        );
        break;
      } catch (error) {
        clearFailedStreamingAssistant(sessionId);
        if (error instanceof ChatStreamError && error.code === 'MCP_ACTION_CONFIRMATION_REQUIRED') {
          submitError.value = '请核对确认卡片中的参数，确认执行后将继续当前请求。';
          confirmationRefresh.value++;
          return;
        }
        if (!isRequestCanceled(error) && selectedSessionId.value === sessionId) {
          submitError.value = error instanceof Error ? error.message : extractApiErrorMessage(error, "发送消息失败");
        }
        return;
      }
    }

    if (controller.signal.aborted) return;

    if (selectedSessionId.value === sessionId) {
      composer.value = "";
    }
    if (pendingChatAttempt === attempt) {
      pendingChatAttempt = null;
      sessionStorage.removeItem('enjoy.pendingChat');
    }
    sessionPage.value = 0;
    await loadSessions();
    await loadToolCallLogs();
    await nextTick();
  } finally {
    if (streamController === controller) {
      sending.value = false;
      streamController = null;
    }
  }
}

function flushPendingDelta() {
  if (deltaFrame !== null) {
    window.cancelAnimationFrame(deltaFrame);
    deltaFrame = null;
  }
  const assistantId = streamingAssistantId.value;
  if (!assistantId || !pendingDelta) return;
  const delta = pendingDelta;
  pendingDelta = "";
  const message = messages.value.find((item) => item.id === assistantId);
  if (message) {
    message.content += delta;
  }
}

watch(selectedAgentId, async (value) => {
  if (initializingWorkspace) return;
  const switchVersion = ++agentSwitchVersion;
  switchingAgent = true;
  try {
    streamController?.abort();
    pendingChatAttempt = null;
    await router.replace({
      query: {
        ...route.query,
        agentId: value || undefined,
        sessionId: undefined
      }
    });
    if (!componentActive || switchVersion !== agentSwitchVersion || value !== selectedAgentId.value) return;
    selectedSessionId.value = null;
    messages.value = [];
    messageTotal.value = 0;
    messageTotalPages.value = 0;
    currentTurn.value = null;
    retrievalDebug.value = null;
    streamStarted.value = null;
    toolCallLogs.value = [];
    sessionPage.value = 0;
    messagePage.value = 0;
    if (!componentActive) return;
    await loadSessions();
    if (!componentActive) return;
    await loadMessages();
    if (!componentActive) return;
    await loadToolCallLogs();
  } finally {
    if (switchVersion === agentSwitchVersion) {
      switchingAgent = false;
    }
  }
});

watch(selectedSessionId, async (value) => {
  confirmations.value = []; executionEvents.value = []; evidence.value = null;

  if (initializingWorkspace || switchingAgent) return;
  streamController?.abort();
  if (pendingChatAttempt?.sessionId !== value) {
    pendingChatAttempt = null;
  }
  messages.value = [];
  messageTotal.value = 0;
  messageTotalPages.value = 0;
  currentTurn.value = null;
  retrievalDebug.value = null;
  streamStarted.value = null;
  toolCallLogs.value = [];
  await router.replace({
    query: {
      ...route.query,
      agentId: selectedAgentId.value || undefined,
      sessionId: value ? String(value) : undefined
    }
  });
  if (!componentActive || value !== selectedSessionId.value) return;
  messagePage.value = 0;
  await loadMessages();
  if (!componentActive) return;
  await loadToolCallLogs();
});

onMounted(async () => {
  componentActive = true;
  const controller = new AbortController();
  workspaceLoadController = controller;
  await loadAgentsAndSessions(controller.signal);
  if (controller.signal.aborted) return;
  initializingWorkspace = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem('enjoy.pendingChat') ?? 'null') as PendingChatAttempt | null;
    if (saved && saved.sessionId === selectedSessionId.value && saved.agentId === Number(selectedAgentId.value)) {
      pendingChatAttempt = saved; composer.value = saved.content;
    }
  } catch { sessionStorage.removeItem('enjoy.pendingChat'); }
  if (controller.signal.aborted) return;
  if (selectedSessionId.value) {
    await loadMessages();
    if (controller.signal.aborted || !componentActive) return;
    await loadToolCallLogs();
  }
  if (workspaceLoadController === controller) {
    workspaceLoadController = null;
  }
});

onBeforeUnmount(() => {
  componentActive = false;
  disposeAgentSelector();
  workspaceLoadController?.abort();
  workspaceLoadController = null;
  sessionLoadController?.abort();
  messageLoadController?.abort();
  toolLogController?.abort();
  streamController?.abort();
  pendingChatAttempt = null;
  if (deltaFrame !== null) {
    window.cancelAnimationFrame(deltaFrame);
  }
  pendingDelta = "";
});
</script>
