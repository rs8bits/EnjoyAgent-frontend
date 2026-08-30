import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticatedFetchMock } = vi.hoisted(() => ({
  authenticatedFetchMock: vi.fn()
}));

vi.mock("@/app/services/http", () => ({
  authenticatedFetch: authenticatedFetchMock,
  extractFetchErrorMessage: vi.fn(async () => "请求失败"),
  extractPagedResponseData: vi.fn(),
  http: {}
}));

import { sendChatMessage, streamChatMessage } from "@/app/services/chat";

const encoder = new TextEncoder();

function sseResponse(payload: string) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    }
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" }
  });
}

describe("streamChatMessage terminal states", () => {
  beforeEach(() => {
    authenticatedFetchMock.mockReset();
  });

  it("resolves only after a completed event", async () => {
    const onCompleted = vi.fn();
    authenticatedFetchMock.mockResolvedValue(sseResponse(
      "event: completed\ndata: {\"sessionId\":7,\"assistantMessage\":{\"content\":\"完成\"}}\n\n"
    ));

    await streamChatMessage(7, {
      content: "hello",
      toolApprovalTokens: ["short-lived-approval"]
    }, { onCompleted });

    expect(onCompleted).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 7 }));
    expect(authenticatedFetchMock).toHaveBeenCalledWith(
      "/api/chat/sessions/7/messages/stream",
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": expect.stringMatching(/^chat_/) }),
        body: JSON.stringify({
          content: "hello",
          toolApprovalTokens: ["short-lived-approval"]
        })
      })
    );
  });

  it("rejects an error event and exposes its message", async () => {
    const onError = vi.fn();
    authenticatedFetchMock.mockResolvedValue(sseResponse(
      "event: error\ndata: {\"code\":\"MODEL_FAILED\",\"message\":\"模型不可用\"}\n\n"
    ));

    await expect(
      streamChatMessage(7, { content: "hello" }, { onError })
    ).rejects.toThrow("模型不可用");
    expect(onError).toHaveBeenCalledWith({ code: "MODEL_FAILED", message: "模型不可用" });
  });

  it("waits for fresh HIGH-risk approval before explicitly resuming with the same key", async () => {
    authenticatedFetchMock
      .mockResolvedValueOnce(sseResponse(
        "event: error\ndata: {\"code\":\"MCP_HIGH_RISK_APPROVAL_REQUIRED\",\"message\":\"fresh approval required\"}\n\n"
      ))
      .mockResolvedValueOnce(sseResponse(
        "event: completed\ndata: {\"sessionId\":7}\n\n"
      ));

    await expect(streamChatMessage(
      7,
      { content: "delete remote data", toolApprovalTokens: ["already-consumed-token"] },
      {},
      { idempotencyKey: "chat_high-risk-turn" }
    )).rejects.toMatchObject({
      name: "ChatStreamError",
      code: "MCP_HIGH_RISK_APPROVAL_REQUIRED",
      message: "fresh approval required"
    });
    expect(authenticatedFetchMock).toHaveBeenCalledTimes(1);

    await streamChatMessage(
      7,
      { content: "delete remote data", toolApprovalTokens: ["freshly-confirmed-token"] },
      {},
      { idempotencyKey: "chat_high-risk-turn" }
    );

    expect(authenticatedFetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/chat/sessions/7/messages/stream",
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "chat_high-risk-turn" }),
        body: JSON.stringify({
          content: "delete remote data",
          toolApprovalTokens: ["already-consumed-token"]
        })
      })
    );
    expect(authenticatedFetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/chat/sessions/7/messages/stream",
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "chat_high-risk-turn" }),
        body: JSON.stringify({
          content: "delete remote data",
          toolApprovalTokens: ["freshly-confirmed-token"]
        })
      })
    );
  });

  it("rejects EOF before completed instead of reporting a false success", async () => {
    authenticatedFetchMock.mockResolvedValue(sseResponse(
      "event: delta\ndata: {\"delta\":\"partial\"}\n\n"
    ));

    await expect(
      streamChatMessage(7, { content: "hello" }, {})
    ).rejects.toThrow("聊天连接在完成前中断");
  });

  it("propagates caller cancellation as AbortError", async () => {
    authenticatedFetchMock.mockResolvedValue(sseResponse(
      "event: completed\ndata: {\"sessionId\":7}\n\n"
    ));
    const controller = new AbortController();
    controller.abort();

    await expect(
      streamChatMessage(7, { content: "hello" }, {}, { signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reuses a caller-supplied idempotency key after a failed attempt", async () => {
    authenticatedFetchMock
      .mockResolvedValueOnce(sseResponse(
        "event: error\ndata: {\"code\":\"MODEL_FAILED\",\"message\":\"temporary failure\"}\n\n"
      ))
      .mockResolvedValueOnce(sseResponse(
        "event: completed\ndata: {\"sessionId\":7}\n\n"
      ));

    await expect(streamChatMessage(
      7,
      { content: "same request" },
      {},
      { idempotencyKey: "chat_stable-retry-key" }
    )).rejects.toThrow("temporary failure");
    await streamChatMessage(
      7,
      { content: "same request" },
      {},
      { idempotencyKey: "chat_stable-retry-key" }
    );

    expect(authenticatedFetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/chat/sessions/7/messages/stream",
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "chat_stable-retry-key" })
      })
    );
    expect(authenticatedFetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/chat/sessions/7/messages/stream",
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "chat_stable-retry-key" })
      })
    );
  });

  it("reuses the same idempotency key when an aborted attempt is retried", async () => {
    authenticatedFetchMock.mockImplementation(async () => sseResponse(
      "event: completed\ndata: {\"sessionId\":7}\n\n"
    ));
    const abortedAttempt = new AbortController();
    abortedAttempt.abort();

    await expect(streamChatMessage(
      7,
      { content: "same aborted request" },
      {},
      { signal: abortedAttempt.signal, idempotencyKey: "chat_aborted-retry-key" }
    )).rejects.toMatchObject({ name: "AbortError" });
    await streamChatMessage(
      7,
      { content: "same aborted request" },
      {},
      { idempotencyKey: "chat_aborted-retry-key" }
    );

    for (const [, options] of authenticatedFetchMock.mock.calls) {
      expect(options).toEqual(expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "chat_aborted-retry-key" })
      }));
    }
  });

  it("adds an idempotency key to the synchronous chat endpoint", async () => {
    const post = vi.fn().mockResolvedValue({ data: { data: { sessionId: 7 } } });
    const httpModule = await import("@/app/services/http");
    Object.assign(httpModule.http, { post });

    await sendChatMessage(7, { content: "hello" }, { idempotencyKey: "chat_sync-key" });

    expect(post).toHaveBeenCalledWith(
      "/api/chat/sessions/7/messages",
      { content: "hello" },
      expect.objectContaining({
        headers: { "Idempotency-Key": "chat_sync-key" }
      })
    );
  });

  it("generates an idempotency key for synchronous chat when callers omit one", async () => {
    const post = vi.fn().mockResolvedValue({ data: { data: { sessionId: 7 } } });
    const httpModule = await import("@/app/services/http");
    Object.assign(httpModule.http, { post });

    await sendChatMessage(7, { content: "hello" });

    expect(post).toHaveBeenCalledWith(
      "/api/chat/sessions/7/messages",
      { content: "hello" },
      expect.objectContaining({
        headers: { "Idempotency-Key": expect.stringMatching(/^chat_/) }
      })
    );
  });
});
