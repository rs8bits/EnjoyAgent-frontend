<template>
  <div class="grid h-full min-h-0 overflow-hidden gap-5 p-5 lg:grid-cols-[280px_minmax(0,1fr)_340px] lg:p-6">
    <SectionCard
      class="flex h-full min-h-0 flex-col overflow-hidden"
      eyebrow="会话"
      title="聊天工作台"
      description="左侧管理 Agent 和会话，中间进行真实对话，右侧查看本轮运行时信息。"
    >
      <div class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
        <div class="space-y-4">
        <UiSelect
          v-model="selectedAgentId"
          label="当前 Agent"
          :options="agentOptions"
          placeholder="请选择一个 Agent"
          :hint="agents.length ? '只有已创建的 Agent 才能发起会话。' : '当前还没有 Agent，请先去 Agent 管理页面创建。'"
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

        <div v-else class="ea-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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

    <SectionCard class="flex h-full min-h-0 flex-col overflow-hidden" eyebrow="对话" title="真实聊天工作台" description="阶段四已经接入会话、消息历史和 SSE 流式输出。">
      <div v-if="!agents.length" class="flex h-full min-h-0 flex-col items-center justify-center rounded-[24px] border border-dashed border-line bg-canvas px-8 text-center">
        <div class="text-lg font-semibold text-ink">当前还没有可用 Agent</div>
        <div class="mt-2 max-w-md text-sm leading-6 text-muted">
          先去 Agent 管理页面创建一个绑定了聊天模型的 Agent，然后回来发起真实会话。
        </div>
        <RouterLink
          class="mt-6 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:brightness-105"
          to="/app/agents"
        >
          去创建 Agent
        </RouterLink>
      </div>

      <div v-else-if="!selectedSessionId" class="flex h-full min-h-0 flex-col items-center justify-center rounded-[24px] border border-dashed border-line bg-canvas px-8 text-center">
        <div class="text-lg font-semibold text-ink">先创建一个新会话</div>
        <div class="mt-2 max-w-md text-sm leading-6 text-muted">
          选择左侧 Agent，然后点击“新建会话”。创建成功后，这里会进入真实的消息流界面。
        </div>
      </div>

      <div v-else class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-5">
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

        <div class="ea-scroll min-h-0 space-y-5 overflow-y-auto pr-1">
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
              <div class="whitespace-pre-wrap break-words">{{ message.content }}</div>
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

        <form class="shrink-0 rounded-[26px] border border-line bg-canvas p-4" @submit.prevent="submitMessage">
          <div class="rounded-[22px] border border-white bg-white px-4 py-4 shadow-sm">
            <textarea
              v-model="composer"
              rows="4"
              placeholder="输入你的问题，让 Agent 检索知识、调用工具，或者解释一段业务流程。"
              class="w-full resize-none border-none bg-transparent text-sm leading-7 text-ink outline-none placeholder:text-muted/70"
            />
            <div class="mt-4 flex items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                <span class="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                  {{ activeAgent?.name ?? "未选 Agent" }}
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-muted">
                  {{ streamStarted?.mode === "SYNC_FALLBACK" ? "同步回退" : "SSE 流式" }}
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
          <div v-if="submitError" class="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ submitError }}
          </div>
        </form>
      </div>
    </SectionCard>

    <div class="ea-scroll min-h-0 space-y-5 overflow-y-auto pr-1">
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
          当前还没有知识检索调试信息。等会话命中知识库后，这里会展示召回片段和分数。
        </div>
      </SectionCard>

      <SectionCard eyebrow="工具轨迹" title="最近工具调用">
        <div v-if="toolLogsLoading" class="rounded-[18px] border border-line bg-canvas px-4 py-8 text-sm text-muted">
          正在加载工具调用轨迹...
        </div>
        <div v-else-if="!toolCallLogs.length" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
          当前这条会话还没有工具调用记录。等 Agent 真的调用 MCP 工具后，这里会展示工具名、状态和耗时。
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
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import { listAgents } from "@/app/services/agents";
import { createChatSession, deleteChatSession, listChatMessages, listChatSessions, streamChatMessage } from "@/app/services/chat";
import { extractApiErrorMessage } from "@/app/services/http";
import { listMcpToolCallLogs } from "@/app/services/mcp";
import type { Agent } from "@/app/types/agent";
import type {
  ChatMessage,
  ChatSession,
  ChatStreamStarted,
  ChatTurn,
  KnowledgeRetrievalDebug
} from "@/app/types/chat";
import type { McpToolCallLog } from "@/app/types/mcp";

const route = useRoute();
const router = useRouter();

const agents = ref<Agent[]>([]);
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

const activeAgent = computed(() =>
  agents.value.find((agent) => String(agent.id) === selectedAgentId.value) ?? null
);

const activeSession = computed(() =>
  sessions.value.find((session) => session.id === selectedSessionId.value) ?? null
);

const agentOptions = computed(() =>
  agents.value.map((agent) => ({
    label: `${agent.name} · ${agent.chatModelBindingType === "OFFICIAL_MODEL" ? "官方模型" : "用户模型"}`,
    value: String(agent.id)
  }))
);

const streamStateLabel = computed(() => {
  if (sending.value) {
    return "正在生成";
  }
  if (streamStarted.value?.mode === "SYNC_FALLBACK") {
    return "同步回退";
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

async function loadAgentsAndSessions() {
  loading.value = true;
  submitError.value = "";
  try {
    const agentResult = await listAgents(0, 999);
    agents.value = agentResult.items;

    const queryAgentId = typeof route.query.agentId === "string" ? route.query.agentId : "";
    const querySessionId = typeof route.query.sessionId === "string" ? Number(route.query.sessionId) : null;

    if (queryAgentId && agents.value.some((agent) => String(agent.id) === queryAgentId)) {
      selectedAgentId.value = queryAgentId;
    } else if (!selectedAgentId.value && agents.value.length) {
      selectedAgentId.value = String(agents.value[0].id);
    }

    await loadSessions();

    if (querySessionId && sessions.value.some((session) => session.id === querySessionId)) {
      selectedSessionId.value = querySessionId;
    } else if (!selectedSessionId.value && sessions.value.length) {
      selectedSessionId.value = sessions.value[0].id;
    }
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载聊天工作台失败");
  } finally {
    loading.value = false;
  }
}

async function loadSessions(newPage?: number) {
  if (newPage !== undefined) sessionPage.value = newPage;
  sessionLoading.value = true;
  try {
    const agentId = selectedAgentId.value ? Number(selectedAgentId.value) : undefined;
    const result = await listChatSessions(agentId, sessionPage.value, sessionPageSize);
    sessions.value = result.items;
    sessionTotal.value = result.total;
    sessionTotalPages.value = result.totalPages;
    if (selectedSessionId.value && !sessions.value.some((session) => session.id === selectedSessionId.value)) {
      selectedSessionId.value = sessions.value[0]?.id ?? null;
    }
  } finally {
    sessionLoading.value = false;
  }
}

async function loadMessages(newPage?: number) {
  if (newPage !== undefined) messagePage.value = newPage;
  if (!selectedSessionId.value) {
    messages.value = [];
    return;
  }

  messagesLoading.value = true;
  try {
    const result = await listChatMessages(selectedSessionId.value, messagePage.value, messagePageSize);
    messages.value = result.items;
    messageTotal.value = result.total;
    messageTotalPages.value = result.totalPages;
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载消息历史失败");
  } finally {
    messagesLoading.value = false;
  }
}

async function loadToolCallLogs() {
  if (!selectedSessionId.value) {
    toolCallLogs.value = [];
    return;
  }

  toolLogsLoading.value = true;
  try {
    toolCallLogs.value = await listMcpToolCallLogs({
      sessionId: selectedSessionId.value,
      limit: 12
    });
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载工具调用轨迹失败");
  } finally {
    toolLogsLoading.value = false;
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
  selectedSessionId.value = sessionId;
  currentTurn.value = null;
  retrievalDebug.value = null;
  streamStarted.value = null;
  toolCallLogs.value = [];
}

async function submitMessage() {
  if (!selectedSessionId.value || !composer.value.trim() || sending.value) {
    return;
  }

  sending.value = true;
  submitError.value = "";
  currentTurn.value = null;
  retrievalDebug.value = null;
  streamStarted.value = null;
  streamingAssistantId.value = null;

  try {
    await streamChatMessage(
      selectedSessionId.value,
      { content: composer.value.trim() },
      {
        onStarted(event) {
          streamStarted.value = event;
          const userMessage: ChatMessage = {
            id: event.userMessageId,
            sessionId: event.sessionId,
            role: "USER",
            content: event.userMessageContent,
            createdAt: new Date().toISOString()
          };
          messages.value = [...messages.value, userMessage];

          const tempAssistantId = -Date.now();
          streamingAssistantId.value = tempAssistantId;
          messages.value = [
            ...messages.value,
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
          retrievalDebug.value = event;
        },
        onDelta(event) {
          if (!streamingAssistantId.value) {
            return;
          }
          messages.value = messages.value.map((message) =>
            message.id === streamingAssistantId.value
              ? { ...message, content: message.content + event.delta }
              : message
          );
        },
        onCompleted(event) {
          currentTurn.value = event;
          retrievalDebug.value = event.retrievalDebug;
          messages.value = messages.value
            .filter((message) => message.id !== streamingAssistantId.value && message.id !== event.userMessage.id)
            .concat([event.userMessage, event.assistantMessage]);
          streamingAssistantId.value = null;
        },
        onError(error) {
          submitError.value = error.message;
        }
      }
    );

    composer.value = "";
    sessionPage.value = 0;
    await loadSessions();
    await loadToolCallLogs();
    await nextTick();
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : extractApiErrorMessage(error, "发送消息失败");
    if (streamingAssistantId.value) {
      messages.value = messages.value.filter((message) => message.id !== streamingAssistantId.value);
      streamingAssistantId.value = null;
    }
  } finally {
    sending.value = false;
  }
}

watch(selectedAgentId, async (value) => {
  const nextQuery = {
    ...route.query,
    agentId: value || undefined,
    sessionId: undefined
  };
  await router.replace({ query: nextQuery });
  selectedSessionId.value = null;
  currentTurn.value = null;
  retrievalDebug.value = null;
  streamStarted.value = null;
  toolCallLogs.value = [];
  sessionPage.value = 0;
  messagePage.value = 0;
  await loadSessions();
  await loadMessages();
  await loadToolCallLogs();
});

watch(selectedSessionId, async (value) => {
  await router.replace({
    query: {
      ...route.query,
      agentId: selectedAgentId.value || undefined,
      sessionId: value ? String(value) : undefined
    }
  });
  messagePage.value = 0;
  await loadMessages();
  await loadToolCallLogs();
});

onMounted(async () => {
  await loadAgentsAndSessions();
  if (selectedSessionId.value) {
    await loadMessages();
    await loadToolCallLogs();
  }
});
</script>
