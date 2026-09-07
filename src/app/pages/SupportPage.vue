<template>
  <div class="flex min-h-full flex-col gap-4 p-3 sm:p-5 lg:h-full lg:min-h-0 lg:p-6">
    <section class="shrink-0 rounded-[26px] border border-white/80 bg-white/85 px-5 py-5 shadow-card backdrop-blur-xl sm:px-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-card">
            <Headphones class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">AI Support</div>
            <h1 class="mt-1 text-xl font-semibold tracking-tight text-ink">EnjoyAgent AI 客服</h1>
            <p class="mt-1 text-sm leading-6 text-muted">
              当前用户与当前工作区共用这一条长期会话，历史消息会自动保存。
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
            敏感操作需确认
          </span>
          <span class="rounded-full bg-accent-soft px-3 py-1.5 font-medium text-accent">
            {{ conversation ? `会话 #${conversation.id}` : "正在连接" }}
          </span>
        </div>
      </div>
    </section>

    <section class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div class="flex min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-card backdrop-blur-xl lg:min-h-0">
        <div
          ref="messageScroller"
          class="ea-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          aria-live="polite"
        >
          <div class="mx-auto max-w-3xl space-y-5">
            <div class="flex justify-center">
              <button
                v-if="hasMoreHistory"
                type="button"
                class="rounded-full border border-line bg-canvas px-4 py-2 text-xs font-medium text-muted transition hover:border-accent hover:text-accent disabled:opacity-60"
                :disabled="loadingOlder"
                @click="loadOlderMessages"
              >
                {{ loadingOlder ? "正在加载…" : "加载更早消息" }}
              </button>
              <span v-else-if="messages.length" class="text-xs text-muted">已到达本会话最早消息</span>
            </div>

            <div v-if="initialLoading" class="rounded-2xl border border-line bg-canvas px-5 py-8 text-center text-sm text-muted">
              正在加载客服历史…
            </div>

            <div
              v-else-if="!messages.length && !streamingAnswer"
              class="rounded-[24px] border border-dashed border-line bg-canvas px-6 py-10 text-center"
            >
              <Bot class="mx-auto h-8 w-8 text-accent" />
              <div class="mt-4 text-base font-semibold text-ink">从一个安全的查询开始</div>
              <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
                可以查询当前工作区资产，也可以提交充值申请或删除资产；敏感操作执行前会要求你明确确认。
              </p>
            </div>

            <article
              v-for="message in messages"
              :key="message.id"
              class="flex"
              :class="message.role === 'USER' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[88%] rounded-[22px] px-4 py-3 sm:max-w-[78%]"
                :class="message.role === 'USER'
                  ? 'rounded-br-md bg-accent text-white shadow-card'
                  : 'rounded-bl-md border border-line bg-canvas text-ink'"
              >
                <div class="whitespace-pre-wrap break-words text-sm leading-7">{{ message.content }}</div>
                <div
                  class="mt-2 text-[11px]"
                  :class="message.role === 'USER' ? 'text-white/70' : 'text-muted'"
                >
                  {{ formatDateTime(message.createdAt) }} · #{{ message.sequence }}
                </div>
              </div>
            </article>

            <!--
              确认卡片只渲染后端提供的安全摘要，不接收、更不展示 Skill 原始参数。
              真正确认时也只发送 confirmationId，避免浏览器修改金额、资源 ID 或身份字段。
            -->
            <article
              v-for="confirmation in confirmations"
              :key="confirmation.confirmationId"
              class="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 shadow-sm sm:p-5"
              role="region"
              :aria-label="confirmation.title"
            >
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <TriangleAlert class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <h2 class="text-sm font-semibold text-ink">{{ confirmation.title }}</h2>
                    <span
                      class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      :class="confirmationStatusClass(confirmation)"
                    >
                      {{ confirmationStatusLabel(confirmation) }}
                    </span>
                  </div>
                  <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                    {{ confirmation.summary }}
                  </p>
                  <div class="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <Clock3 class="h-3.5 w-3.5" />
                    请在 {{ formatDateTime(confirmation.expiresAt) }} 前完成操作
                  </div>

                  <p
                    v-if="confirmation.errorMessage"
                    class="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"
                    role="alert"
                  >
                    {{ confirmation.errorMessage }}
                  </p>
                  <p
                    v-else-if="confirmation.resultMessage"
                    class="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs leading-5 text-muted"
                  >
                    {{ confirmation.resultMessage }}
                  </p>

                  <div v-if="confirmationCanOperate(confirmation)" class="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="sending || confirmation.processing !== null"
                      @click="processConfirmation(confirmation, 'cancel')"
                    >
                      <LoaderCircle v-if="confirmation.processing === 'cancel'" class="h-3.5 w-3.5 animate-spin" />
                      <X v-else class="h-3.5 w-3.5" />
                      取消
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="sending || confirmation.processing !== null"
                      @click="processConfirmation(confirmation, 'confirm')"
                    >
                      <LoaderCircle v-if="confirmation.processing === 'confirm'" class="h-3.5 w-3.5 animate-spin" />
                      <Check v-else class="h-3.5 w-3.5" />
                      确认执行
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article v-if="streamingAnswer || sending" class="flex justify-start">
              <div class="max-w-[88%] rounded-[22px] rounded-bl-md border border-accent/20 bg-accent-soft px-4 py-3 text-ink sm:max-w-[78%]">
                <div v-if="streamingAnswer" class="whitespace-pre-wrap break-words text-sm leading-7">
                  {{ streamingAnswer }}<span class="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-full bg-accent align-middle" />
                </div>
                <div v-else class="flex items-center gap-2 text-sm text-muted">
                  <LoaderCircle class="h-4 w-4 animate-spin text-accent" />
                  {{ progressText }}
                </div>
              </div>
            </article>
          </div>
        </div>

        <form class="shrink-0 border-t border-line bg-canvas/80 p-4 sm:p-5" @submit.prevent="submitMessage">
          <div class="mx-auto max-w-3xl rounded-[22px] border border-line bg-white p-3 shadow-sm focus-within:border-accent">
            <textarea
              v-model="composer"
              rows="3"
              maxlength="4000"
              aria-label="发送给 AI 客服的消息"
              placeholder="例如：当前工作区有哪些 Agent？我的充值申请审核了吗？"
              class="w-full resize-none border-none bg-transparent px-1 text-sm leading-7 text-ink outline-none placeholder:text-muted/70"
              :disabled="sending || initialLoading"
              @keydown.enter.exact.prevent="submitMessage"
            />
            <div class="mt-2 flex items-center justify-between gap-3">
              <span class="text-xs text-muted">{{ composer.length }} / 4000 · Shift + Enter 换行</span>
              <button
                type="submit"
                class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="sending || initialLoading || !composer.trim()"
              >
                <LoaderCircle v-if="sending" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                {{ sending ? "处理中" : "发送" }}
              </button>
            </div>
          </div>
          <p v-if="pageError" class="mx-auto mt-3 max-w-3xl text-sm text-rose-600" role="alert">
            {{ pageError }}
          </p>
        </form>
      </div>

      <aside class="space-y-4">
        <section class="rounded-[26px] border border-white/80 bg-white/85 p-5 shadow-card backdrop-blur-xl">
          <div class="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck class="h-4 w-4 text-emerald-600" />
            当前安全边界
          </div>
          <ul class="mt-4 space-y-3 text-xs leading-5 text-muted">
            <li class="rounded-2xl bg-canvas px-3 py-3">资产只按当前租户查询，凭证与账单只按当前用户查询。</li>
            <li class="rounded-2xl bg-canvas px-3 py-3">API Key 仅展示是否已配置，掩码和明文都不会进入模型上下文。</li>
            <li class="rounded-2xl bg-canvas px-3 py-3">充值申请和资产删除只有在确认卡片中明确确认后才会执行。</li>
            <li class="rounded-2xl bg-canvas px-3 py-3">确认卡片只展示安全摘要，原始工具参数不会发送到浏览器。</li>
          </ul>
        </section>

        <section class="rounded-[26px] border border-white/80 bg-white/85 p-5 shadow-card backdrop-blur-xl">
          <div class="flex items-center gap-2 text-sm font-semibold text-ink">
            <Activity class="h-4 w-4 text-accent" />
            本轮执行状态
          </div>
          <div class="mt-4 rounded-2xl border border-line bg-canvas px-3 py-3 text-xs leading-5 text-muted">
            {{ progressText }}
          </div>
          <div v-if="skillActivities.length" class="mt-3 space-y-2">
            <div
              v-for="activity in skillActivities"
              :key="activity.callId"
              class="rounded-2xl border border-line px-3 py-3"
            >
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="truncate font-semibold text-ink">{{ activity.displayName }}</span>
                <span :class="activity.status === 'SUCCESS' ? 'text-emerald-600' : activity.status === 'FAILED' ? 'text-rose-600' : 'text-accent'">
                  {{ skillStatusLabel(activity.status) }}
                </span>
              </div>
              <p v-if="activity.summary" class="mt-1 text-xs leading-5 text-muted">{{ activity.summary }}</p>
            </div>
          </div>
        </section>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-[20px] border border-line bg-white px-4 py-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent disabled:opacity-60"
          :disabled="initialLoading || sending"
          @click="reloadConversation"
        >
          <RefreshCw class="h-4 w-4" />
          刷新历史
        </button>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import {
  Activity,
  Bot,
  Check,
  Clock3,
  Headphones,
  LoaderCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  TriangleAlert,
  X
} from "lucide-vue-next";
import { extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";
import {
  SupportStreamError,
  cancelSupportAction,
  confirmSupportAction,
  createSupportIdempotencyKey,
  getSupportConversation,
  listPendingSupportConfirmations,
  listSupportMessages,
  streamSupportMessage
} from "@/app/services/support";
import type {
  SupportConfirmationRequiredEvent,
  SupportConversation,
  SupportMessage
} from "@/app/types/support";

interface SkillActivity {
  callId: string;
  displayName: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  summary: string;
}

/**
 * SSE 事件之外的字段只描述当前页面交互状态，不会作为确认参数发回后端。
 * status 始终以后端为准；processing 仅用于防止按钮在请求期间重复点击。
 */
interface ConfirmationActivity extends SupportConfirmationRequiredEvent {
  status: string;
  processing: "confirm" | "cancel" | null;
  resultMessage: string;
  errorMessage: string;
}

const conversation = ref<SupportConversation | null>(null);
const messages = ref<SupportMessage[]>([]);
const composer = ref("");
const initialLoading = ref(true);
const loadingOlder = ref(false);
const sending = ref(false);
const hasMoreHistory = ref(false);
const nextBeforeSequence = ref<number | null>(null);
const streamingAnswer = ref("");
const progressText = ref("等待发送问题");
const pageError = ref("");
const skillActivities = ref<SkillActivity[]>([]);
const confirmations = ref<ConfirmationActivity[]>([]);
// 让“已过期”状态能随时间刷新，而不是只在用户点击按钮时才计算。
const currentTime = ref(Date.now());
const messageScroller = ref<HTMLElement | null>(null);
let activeRequest: AbortController | null = null;
let expiryRefreshTimer: number | null = null;
const confirmationRequests = new Map<string, AbortController>();
// 网络中断后保留同一业务请求的幂等键。用户直接再次发送相同文本时，服务端会
// 重放已完成结果或接管失败 Turn，而不会重复写入用户消息、重复执行 Skill。
let retryableRequest: { content: string; idempotencyKey: string } | null = null;

onMounted(() => {
  void reloadConversation();
  expiryRefreshTimer = globalThis.setInterval(() => {
    currentTime.value = Date.now();
  }, 30_000);
});

onBeforeUnmount(() => {
  activeRequest?.abort();
  for (const controller of confirmationRequests.values()) {
    controller.abort();
  }
  confirmationRequests.clear();
  if (expiryRefreshTimer !== null) {
    globalThis.clearInterval(expiryRefreshTimer);
  }
});

/**
 * 服务端保证 user + tenant 唯一会话，因此页面只获取一次，不提供“新建会话”按钮。
 */
async function reloadConversation() {
  if (sending.value) {
    return;
  }
  initialLoading.value = true;
  pageError.value = "";
  try {
    conversation.value = await getSupportConversation();
    const [slice, pendingConfirmations] = await Promise.all([
      listSupportMessages(undefined, 30),
      listPendingSupportConfirmations()
    ]);
    messages.value = [...slice.items].sort((left, right) => left.sequence - right.sequence);
    // 待确认记录以数据库为准，刷新不会丢卡片，也不会保留已在其他标签页处理的旧状态。
    confirmations.value = pendingConfirmations.map((event) => ({
      ...event,
      status: "PENDING",
      processing: null,
      resultMessage: "",
      errorMessage: ""
    }));
    hasMoreHistory.value = slice.hasMore;
    nextBeforeSequence.value = slice.nextBeforeSequence;
    progressText.value = "等待发送问题";
    await scrollToBottom();
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : "客服历史加载失败，请稍后重试。";
  } finally {
    initialLoading.value = false;
  }
}

/** 向前加载历史时保持用户当前阅读位置，避免列表突然跳动。 */
async function loadOlderMessages() {
  if (loadingOlder.value || nextBeforeSequence.value === null) {
    return;
  }
  loadingOlder.value = true;
  pageError.value = "";
  const element = messageScroller.value;
  const previousHeight = element?.scrollHeight ?? 0;
  try {
    const slice = await listSupportMessages(nextBeforeSequence.value, 30);
    mergeMessages(slice.items);
    hasMoreHistory.value = slice.hasMore;
    nextBeforeSequence.value = slice.nextBeforeSequence;
    await nextTick();
    if (element) {
      element.scrollTop += element.scrollHeight - previousHeight;
    }
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : "更早消息加载失败。";
  } finally {
    loadingOlder.value = false;
  }
}

async function submitMessage() {
  const content = composer.value.trim();
  if (!content || sending.value || initialLoading.value) {
    return;
  }

  sending.value = true;
  pageError.value = "";
  streamingAnswer.value = "";
  skillActivities.value = [];
  progressText.value = "正在提交并进行安全检查…";
  composer.value = "";
  const requestController = new AbortController();
  activeRequest = requestController;
  const idempotencyKey = retryableRequest?.content === content
    ? retryableRequest.idempotencyKey
    : createSupportIdempotencyKey();
  retryableRequest = { content, idempotencyKey };

  try {
    await streamSupportMessage(
      { content },
      {
        onAccepted(event) {
          mergeMessage(event.userMessage);
          progressText.value = "消息已保存，正在识别意图…";
          void scrollToBottom();
        },
        onIntentRouted(event) {
          progressText.value = event.route === "RULE"
            ? "已命中快速回答"
            : event.route === "SKILL"
              ? "正在查询所需业务数据…"
              : "正在组织回答…";
        },
        onSkillStarted(event) {
          skillActivities.value.push({
            callId: event.callId,
            displayName: event.displayName || event.skillName,
            status: "RUNNING",
            summary: ""
          });
          progressText.value = `正在执行：${event.displayName || event.skillName}`;
        },
        onSkillCompleted(event) {
          const activity = skillActivities.value.find((item) => item.callId === event.callId);
          if (activity) {
            activity.status = event.status === "SUCCESS" ? "SUCCESS" : "FAILED";
            activity.summary = event.summary || "";
          }
          progressText.value = event.status === "SUCCESS" ? "查询完成，正在生成回答…" : "查询失败";
        },
        onConfirmationRequired(event) {
          upsertConfirmation(event);
          progressText.value = "敏感操作已准备，等待你的明确确认";
          void scrollToBottom();
        },
        onDelta(event) {
          streamingAnswer.value += event.delta;
          progressText.value = "正在流式回答…";
          void scrollToBottom();
        },
        onCompleted(event) {
          mergeMessage(event.assistantMessage);
          streamingAnswer.value = "";
          progressText.value = confirmations.value.some(
            (item) => item.turnId === event.turnId && item.status === "PENDING"
          )
            ? "回答已保存，有一项敏感操作等待确认"
            : "回答完成并已保存";
          retryableRequest = null;
          void scrollToBottom();
        },
        onError(event) {
          pageError.value = event.message || "客服处理失败，请稍后重试。";
          progressText.value = "本轮处理失败";
        }
      },
      {
        signal: requestController.signal,
        idempotencyKey,
        idleTimeoutMs: 120_000
      }
    );
  } catch (error) {
    if (!isRequestCanceled(error)) {
      pageError.value = error instanceof SupportStreamError || error instanceof Error
        ? error.message
        : "客服处理失败，请稍后重试。";
      progressText.value = "本轮处理失败";
    }
    // 失败后的半截流式文本没有被服务端标记为最终消息，不混入正式历史。
    streamingAnswer.value = "";
    // 把原问题放回输入框，让用户可以直接重试。只要文本未修改，上面的
    // retryableRequest 就会复用同一个幂等键。
    if (!isRequestCanceled(error) && !composer.value.trim()) {
      composer.value = content;
    }
  } finally {
    if (activeRequest === requestController) {
      activeRequest = null;
    }
    sending.value = false;
  }
}

/** 同一个确认事件可能因 SSE 重放再次到达，按 confirmationId 幂等更新。 */
function upsertConfirmation(event: SupportConfirmationRequiredEvent) {
  const existing = confirmations.value.find((item) => item.confirmationId === event.confirmationId);
  if (existing) {
    Object.assign(existing, event);
    return;
  }
  confirmations.value.push({
    ...event,
    status: "PENDING",
    processing: null,
    resultMessage: "",
    errorMessage: ""
  });
}

/**
 * 确认和取消都只提交 confirmationId。响应中的消息由后端正式落库后返回，
 * 因而可以安全地合并进唯一会话；页面不会自行构造“已执行”消息。
 */
async function processConfirmation(
  confirmation: ConfirmationActivity,
  action: "confirm" | "cancel"
) {
  if (confirmation.status !== "PENDING" || confirmation.processing !== null || sending.value) {
    return;
  }
  currentTime.value = Date.now();
  if (confirmationIsExpired(confirmation)) {
    confirmation.status = "EXPIRED";
    confirmation.resultMessage = "该确认请求已过期，请重新向客服发起操作。";
    return;
  }

  const requestController = new AbortController();
  confirmationRequests.set(confirmation.confirmationId, requestController);
  confirmation.processing = action;
  confirmation.errorMessage = "";
  progressText.value = action === "confirm" ? "正在安全执行已确认操作…" : "正在取消待确认操作…";

  try {
    const result = action === "confirm"
      ? await confirmSupportAction(confirmation.confirmationId, requestController.signal)
      : await cancelSupportAction(confirmation.confirmationId, requestController.signal);

    confirmation.status = result.status;
    confirmation.resultMessage = result.message
      || (action === "confirm" ? "操作已经处理。" : "操作已经取消。");

    // 后端可能同时保存“用户确认”和“客服执行结果”两条消息，按 sequence 合并
    // 可以兼容二者均返回、仅返回一条或都不返回的情况。
    const persistedMessages = [result.userMessage, result.assistantMessage]
      .filter((message): message is SupportMessage => message != null);
    mergeMessages(persistedMessages);
    progressText.value = action === "confirm" ? "确认操作处理完成" : "待确认操作已取消";
    await scrollToBottom();
  } catch (error) {
    if (!isRequestCanceled(error)) {
      confirmation.errorMessage = extractApiErrorMessage(
        error,
        action === "confirm" ? "确认执行失败，请稍后重试。" : "取消失败，请稍后重试。"
      );
      progressText.value = action === "confirm" ? "确认操作执行失败" : "取消操作失败";
    }
  } finally {
    confirmation.processing = null;
    confirmationRequests.delete(confirmation.confirmationId);
  }
}

function confirmationIsExpired(confirmation: ConfirmationActivity) {
  const expiresAt = new Date(confirmation.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= currentTime.value;
}

function confirmationCanOperate(confirmation: ConfirmationActivity) {
  return confirmation.status === "PENDING" && !confirmationIsExpired(confirmation);
}

function confirmationStatusLabel(confirmation: ConfirmationActivity) {
  if (confirmationIsExpired(confirmation) || confirmation.status === "EXPIRED") {
    return "已过期";
  }
  const labels: Record<string, string> = {
    PENDING: "等待确认",
    EXECUTED: "已执行",
    COMPLETED: "已执行",
    CANCELLED: "已取消",
    FAILED: "执行失败"
  };
  return labels[confirmation.status] || confirmation.status;
}

function confirmationStatusClass(confirmation: ConfirmationActivity) {
  if (confirmationIsExpired(confirmation) || confirmation.status === "EXPIRED") {
    return "bg-slate-100 text-slate-600";
  }
  if (confirmation.status === "EXECUTED" || confirmation.status === "COMPLETED") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (confirmation.status === "CANCELLED") {
    return "bg-slate-100 text-slate-600";
  }
  if (confirmation.status === "FAILED") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-700";
}

function mergeMessages(incoming: SupportMessage[]) {
  const byId = new Map(messages.value.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  messages.value = [...byId.values()].sort((left, right) => left.sequence - right.sequence);
}

function mergeMessage(message: SupportMessage) {
  mergeMessages([message]);
}

async function scrollToBottom() {
  await nextTick();
  const element = messageScroller.value;
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

function skillStatusLabel(status: SkillActivity["status"]) {
  if (status === "SUCCESS") {
    return "完成";
  }
  if (status === "FAILED") {
    return "失败";
  }
  return "执行中";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}
</script>
