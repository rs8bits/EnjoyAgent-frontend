import { authenticatedFetch, extractFetchErrorMessage, extractPagedResponseData, http } from "@/app/services/http";
import { consumeSseStream } from "@/app/services/sse";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
import type {
  ChatMessage,
  ChatSession,
  ChatStreamDelta,
  ChatStreamStarted,
  ChatTurn,
  CreateChatSessionPayload,
  KnowledgeRetrievalDebug,
  SendChatMessagePayload
} from "@/app/types/chat";

export const MCP_HIGH_RISK_APPROVAL_REQUIRED = "MCP_HIGH_RISK_APPROVAL_REQUIRED";

export class ChatStreamError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ChatStreamError";
    this.code = code;
  }
}

export async function createChatSession(payload: CreateChatSessionPayload) {
  const response = await http.post<ApiResponse<ChatSession>>("/api/chat/sessions", payload);
  return response.data.data;
}

export async function listChatSessions(agentId?: number, page = 0, size = 20, signal?: AbortSignal) {
  const response = await http.get<ApiResponse<PagedResponse<ChatSession>>>("/api/chat/sessions", {
    params: { ...(agentId ? { agentId } : {}), page, size },
    signal
  });
  return extractPagedResponseData(response);
}

export async function listChatMessages(sessionId: number, page = 0, size = 20, signal?: AbortSignal) {
  const response = await http.get<ApiResponse<PagedResponse<ChatMessage>>>(
    `/api/chat/sessions/${sessionId}/messages`,
    { params: { page, size }, signal }
  );
  return extractPagedResponseData(response);
}

export async function deleteChatSession(sessionId: number) {
  await http.delete<ApiResponse<null>>(`/api/chat/sessions/${sessionId}`);
}

export function createChatIdempotencyKey() {
  return `chat_${globalThis.crypto.randomUUID()}`;
}

interface SendOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export async function sendChatMessage(
  sessionId: number,
  payload: SendChatMessagePayload,
  options: SendOptions = {}
) {
  const response = await http.post<ApiResponse<ChatTurn>>(
    `/api/chat/sessions/${sessionId}/messages`,
    payload,
    {
      headers: { "Idempotency-Key": options.idempotencyKey ?? createChatIdempotencyKey() },
      signal: options.signal
    }
  );
  return response.data.data;
}

interface StreamHandlers {
  onStarted?: (event: ChatStreamStarted) => void;
  onRetrieval?: (event: KnowledgeRetrievalDebug) => void;
  onDelta?: (event: ChatStreamDelta) => void;
  onCompleted?: (event: ChatTurn) => void;
  onError?: (error: { code: string; message: string }) => void;
}

interface StreamOptions {
  signal?: AbortSignal;
  idleTimeoutMs?: number;
  idempotencyKey?: string;
}

export async function streamChatMessage(
  sessionId: number,
  payload: SendChatMessagePayload,
  handlers: StreamHandlers,
  options: StreamOptions = {}
) {
  const response = await authenticatedFetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey ?? createChatIdempotencyKey()
    },
    body: JSON.stringify(payload),
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(await extractFetchErrorMessage(response, "聊天请求失败"));
  }

  if (!response.body) {
    throw new Error("当前浏览器环境不支持流式响应。");
  }

  let completed = false;
  await consumeSseStream(response.body, ({ event, data }) => {
    if (event === "started") {
      handlers.onStarted?.(JSON.parse(data) as ChatStreamStarted);
    } else if (event === "retrieval") {
      handlers.onRetrieval?.(JSON.parse(data) as KnowledgeRetrievalDebug);
    } else if (event === "delta") {
      handlers.onDelta?.(JSON.parse(data) as ChatStreamDelta);
    } else if (event === "completed") {
      completed = true;
      handlers.onCompleted?.(JSON.parse(data) as ChatTurn);
    } else if (event === "error") {
      const streamError = JSON.parse(data) as { code: string; message: string };
      handlers.onError?.(streamError);
      throw new ChatStreamError(streamError.code, streamError.message || "聊天请求失败");
    }
  }, {
    signal: options.signal,
    idleTimeoutMs: options.idleTimeoutMs
  });

  if (!completed) {
    throw new Error("聊天连接在完成前中断，请重试。");
  }
}
