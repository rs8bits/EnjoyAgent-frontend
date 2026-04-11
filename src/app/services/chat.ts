import { http, getHttpAccessToken } from "@/app/services/http";
import type { ApiErrorPayload, ApiResponse } from "@/app/types/api";
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

export async function createChatSession(payload: CreateChatSessionPayload) {
  const response = await http.post<ApiResponse<ChatSession>>("/api/chat/sessions", payload);
  return response.data.data;
}

export async function listChatSessions(agentId?: number) {
  const response = await http.get<ApiResponse<ChatSession[]>>("/api/chat/sessions", {
    params: agentId ? { agentId } : undefined
  });
  return response.data.data;
}

export async function listChatMessages(sessionId: number) {
  const response = await http.get<ApiResponse<ChatMessage[]>>(`/api/chat/sessions/${sessionId}/messages`);
  return response.data.data;
}

export async function deleteChatSession(sessionId: number) {
  await http.delete<ApiResponse<null>>(`/api/chat/sessions/${sessionId}`);
}

export async function sendChatMessage(sessionId: number, payload: SendChatMessagePayload) {
  const response = await http.post<ApiResponse<ChatTurn>>(`/api/chat/sessions/${sessionId}/messages`, payload);
  return response.data.data;
}

interface StreamHandlers {
  onStarted?: (event: ChatStreamStarted) => void;
  onRetrieval?: (event: KnowledgeRetrievalDebug) => void;
  onDelta?: (event: ChatStreamDelta) => void;
  onCompleted?: (event: ChatTurn) => void;
  onError?: (error: { code: string; message: string }) => void;
}

export async function streamChatMessage(
  sessionId: number,
  payload: SendChatMessagePayload,
  handlers: StreamHandlers
) {
  const accessToken = getHttpAccessToken();
  if (!accessToken) {
    throw new Error("未找到登录凭证，请重新登录后再试。");
  }

  const response = await fetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorMessage = "聊天请求失败";
    try {
      const errorBody = await response.json() as ApiResponse<ApiErrorPayload>;
      errorMessage = errorBody?.data?.message || errorBody?.message || errorMessage;
    } catch {
      // ignore json parse errors
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("当前浏览器环境不支持流式响应。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = dispatchSseBuffer(buffer, handlers);
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    dispatchRawEvent(buffer, handlers);
  }
}

function parseSseEvent(rawEvent: string) {
  const lines = rawEvent.split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    event,
    data: dataLines.join("\n")
  };
}

function dispatchSseBuffer(buffer: string, handlers: StreamHandlers) {
  const events = buffer.split("\n\n");
  const remainder = events.pop() ?? "";

  for (const rawEvent of events) {
    dispatchRawEvent(rawEvent, handlers);
  }

  return remainder;
}

function dispatchRawEvent(rawEvent: string, handlers: StreamHandlers) {
  const parsed = parseSseEvent(rawEvent);
  if (!parsed?.data) {
    return;
  }

  const { event, data } = parsed;
  if (event === "started") {
    handlers.onStarted?.(JSON.parse(data) as ChatStreamStarted);
    return;
  }
  if (event === "retrieval") {
    handlers.onRetrieval?.(JSON.parse(data) as KnowledgeRetrievalDebug);
    return;
  }
  if (event === "delta") {
    handlers.onDelta?.(JSON.parse(data) as ChatStreamDelta);
    return;
  }
  if (event === "completed") {
    handlers.onCompleted?.(JSON.parse(data) as ChatTurn);
    return;
  }
  if (event === "error") {
    handlers.onError?.(JSON.parse(data) as { code: string; message: string });
  }
}
