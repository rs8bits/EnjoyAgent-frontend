import { authenticatedFetch, extractFetchErrorMessage, http } from "@/app/services/http";
import { consumeSseStream } from "@/app/services/sse";
import type { ApiResponse } from "@/app/types/api";
import type {
  SendSupportMessagePayload,
  SupportAcceptedEvent,
  SupportCompletedEvent,
  SupportConfirmationActionResult,
  SupportConfirmationRequiredEvent,
  SupportConversation,
  SupportDeltaEvent,
  SupportErrorEvent,
  SupportIntentRoutedEvent,
  SupportMessageSlice,
  SupportSkillCompletedEvent,
  SupportSkillStartedEvent
} from "@/app/types/support";

/** 业务错误码需要保留，页面可据此决定是否给出重试提示。 */
export class SupportStreamError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "SupportStreamError";
    this.code = code;
    this.retryable = retryable;
  }
}

/** 获取或原子创建当前用户、当前租户唯一的客服会话。 */
export async function getSupportConversation(signal?: AbortSignal) {
  const response = await http.get<ApiResponse<SupportConversation>>("/api/support/conversation", { signal });
  return response.data.data;
}

/**
 * 向更早的 sequence 翻页。首次加载不传 beforeSequence，后端返回最新一段历史。
 */
export async function listSupportMessages(
  beforeSequence?: number,
  limit = 30,
  signal?: AbortSignal
) {
  const response = await http.get<ApiResponse<SupportMessageSlice>>(
    "/api/support/conversation/messages",
    {
      params: {
        ...(beforeSequence !== undefined ? { beforeSequence } : {}),
        limit
      },
      signal
    }
  );
  return response.data.data;
}

/** 页面刷新后恢复仍有效的确认卡片；响应仍然不包含原始工具参数。 */
export async function listPendingSupportConfirmations(signal?: AbortSignal) {
  const response = await http.get<ApiResponse<SupportConfirmationRequiredEvent[]>>(
    "/api/support/confirmations/pending",
    { signal }
  );
  return response.data.data;
}

/**
 * 执行一个已经由后端创建、绑定完整参数并完成签名校验的待确认操作。
 *
 * 请求体故意为空：资源 ID、金额等参数只能使用确认记录中冻结的值，前端没有
 * 再次提交或修改参数的机会。后端仍会在执行前重新认证并检查权限和有效期。
 */
export async function confirmSupportAction(confirmationId: string, signal?: AbortSignal) {
  const response = await http.post<ApiResponse<SupportConfirmationActionResult>>(
    `/api/support/confirmations/${encodeURIComponent(confirmationId)}/confirm`,
    {},
    { signal }
  );
  return response.data.data;
}

/** 取消只提交确认记录 ID；取消后同一确认记录不能再次执行。 */
export async function cancelSupportAction(confirmationId: string, signal?: AbortSignal) {
  const response = await http.post<ApiResponse<SupportConfirmationActionResult>>(
    `/api/support/confirmations/${encodeURIComponent(confirmationId)}/cancel`,
    {},
    { signal }
  );
  return response.data.data;
}

/** 重试同一业务请求时应复用这个键，避免重复写入消息或重复执行 skill。 */
export function createSupportIdempotencyKey() {
  return `support_${globalThis.crypto.randomUUID()}`;
}

export interface SupportStreamHandlers {
  onAccepted?: (event: SupportAcceptedEvent) => void;
  onIntentRouted?: (event: SupportIntentRoutedEvent) => void;
  onSkillStarted?: (event: SupportSkillStartedEvent) => void;
  onSkillCompleted?: (event: SupportSkillCompletedEvent) => void;
  onConfirmationRequired?: (event: SupportConfirmationRequiredEvent) => void;
  onDelta?: (event: SupportDeltaEvent) => void;
  onCompleted?: (event: SupportCompletedEvent) => void;
  onError?: (event: SupportErrorEvent) => void;
}

export interface SupportStreamOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
  idleTimeoutMs?: number;
}

/**
 * 使用 POST + fetch 消费 SSE，因为浏览器原生 EventSource 不能携带 JSON 请求体。
 * 每个已知事件都先完成 JSON 解码，再交给页面更新；未知事件向前兼容地忽略。
 */
export async function streamSupportMessage(
  payload: SendSupportMessagePayload,
  handlers: SupportStreamHandlers,
  options: SupportStreamOptions = {}
) {
  const response = await authenticatedFetch("/api/support/conversation/messages/stream", {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey ?? createSupportIdempotencyKey()
    },
    body: JSON.stringify(payload),
    signal: options.signal,
    // HTTP 建连超时不适用于已经建立的长连接；流内“无事件超时”由
    // consumeSseStream 的 idleTimeoutMs 单独负责。
    timeoutMs: 0
  });

  if (!response.ok) {
    throw new SupportStreamError(
      "SUPPORT_REQUEST_FAILED",
      await extractFetchErrorMessage(response, "客服请求失败，请稍后重试。"),
      response.status >= 500
    );
  }
  if (!response.body) {
    throw new SupportStreamError("SUPPORT_STREAM_UNSUPPORTED", "当前浏览器环境不支持流式客服响应。");
  }

  let completed = false;
  await consumeSseStream(response.body, ({ event, data }) => {
    try {
      if (event === "accepted") {
        handlers.onAccepted?.(JSON.parse(data) as SupportAcceptedEvent);
      } else if (event === "intent_routed") {
        handlers.onIntentRouted?.(JSON.parse(data) as SupportIntentRoutedEvent);
      } else if (event === "skill_started") {
        handlers.onSkillStarted?.(JSON.parse(data) as SupportSkillStartedEvent);
      } else if (event === "skill_completed") {
        handlers.onSkillCompleted?.(JSON.parse(data) as SupportSkillCompletedEvent);
      } else if (event === "confirmation_required") {
        handlers.onConfirmationRequired?.(JSON.parse(data) as SupportConfirmationRequiredEvent);
      } else if (event === "delta") {
        handlers.onDelta?.(JSON.parse(data) as SupportDeltaEvent);
      } else if (event === "completed") {
        completed = true;
        handlers.onCompleted?.(JSON.parse(data) as SupportCompletedEvent);
      } else if (event === "error") {
        const streamError = JSON.parse(data) as SupportErrorEvent;
        handlers.onError?.(streamError);
        throw new SupportStreamError(
          streamError.code || "SUPPORT_STREAM_FAILED",
          streamError.message || "客服处理失败，请稍后重试。",
          Boolean(streamError.retryable)
        );
      }
    } catch (error) {
      if (error instanceof SupportStreamError) {
        throw error;
      }
      throw new SupportStreamError(
        "SUPPORT_STREAM_PROTOCOL_ERROR",
        "客服响应格式异常，请刷新页面后重试。",
        true
      );
    }
  }, {
    signal: options.signal,
    idleTimeoutMs: options.idleTimeoutMs
  });

  if (!completed) {
    throw new SupportStreamError(
      "SUPPORT_STREAM_INCOMPLETE",
      "客服连接在回答完成前中断，请稍后重试。",
      true
    );
  }
}
