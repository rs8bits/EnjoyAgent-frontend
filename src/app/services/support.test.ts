import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticatedFetchMock, getMock, postMock } = vi.hoisted(() => ({
  authenticatedFetchMock: vi.fn(),
  getMock: vi.fn(),
  postMock: vi.fn()
}));

vi.mock("@/app/services/http", () => ({
  authenticatedFetch: authenticatedFetchMock,
  extractFetchErrorMessage: vi.fn(async () => "请求失败"),
  http: { get: getMock, post: postMock }
}));

import {
  cancelSupportAction,
  confirmSupportAction,
  getSupportConversation,
  listPendingSupportConfirmations,
  listSupportMessages,
  streamSupportMessage
} from "@/app/services/support";

const encoder = new TextEncoder();

function sseResponse(payload: string) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    }
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

describe("support service", () => {
  beforeEach(() => {
    authenticatedFetchMock.mockReset();
    getMock.mockReset();
    postMock.mockReset();
  });

  it("loads the implicit singleton conversation without accepting a user supplied id", async () => {
    getMock.mockResolvedValue({ data: { data: { id: 9, tenantId: 7, userId: 11 } } });

    await expect(getSupportConversation()).resolves.toEqual(expect.objectContaining({ id: 9 }));
    expect(getMock).toHaveBeenCalledWith("/api/support/conversation", { signal: undefined });
  });

  it("uses a stable sequence cursor for older history", async () => {
    getMock.mockResolvedValue({ data: { data: { items: [], hasMore: false } } });

    await listSupportMessages(42, 20);

    expect(getMock).toHaveBeenCalledWith(
      "/api/support/conversation/messages",
      expect.objectContaining({ params: { beforeSequence: 42, limit: 20 } })
    );
  });

  it("restores pending confirmation cards after a page refresh", async () => {
    getMock.mockResolvedValue({ data: { data: [{ confirmationId: "confirm-1" }] } });

    await expect(listPendingSupportConfirmations()).resolves.toEqual([
      expect.objectContaining({ confirmationId: "confirm-1" })
    ]);
    expect(getMock).toHaveBeenCalledWith("/api/support/confirmations/pending", { signal: undefined });
  });

  it("decodes routing, skill, confirmation and streaming events and disables the generic HTTP timeout", async () => {
    const onAccepted = vi.fn();
    const onSkillCompleted = vi.fn();
    const onConfirmationRequired = vi.fn();
    const onDelta = vi.fn();
    const onCompleted = vi.fn();
    authenticatedFetchMock.mockResolvedValue(sseResponse([
      "event: accepted\ndata: {\"conversationId\":9,\"turnId\":\"turn-1\",\"userMessage\":{\"id\":1}}\n\n",
      "event: skill_completed\ndata: {\"turnId\":\"turn-1\",\"callId\":\"call-1\",\"skillName\":\"agent.search\",\"status\":\"SUCCESS\"}\n\n",
      "event: confirmation_required\ndata: {\"turnId\":\"turn-1\",\"confirmationId\":\"confirm-1\",\"skillName\":\"agent.delete\",\"title\":\"确认删除 Agent\",\"summary\":\"将删除 Agent #1\",\"expiresAt\":\"2030-01-01T00:00:00Z\"}\n\n",
      "event: delta\ndata: {\"turnId\":\"turn-1\",\"delta\":\"你好\"}\n\n",
      "event: completed\ndata: {\"turnId\":\"turn-1\",\"assistantMessage\":{\"id\":2}}\n\n"
    ].join("")));

    await streamSupportMessage(
      { content: "有哪些 Agent" },
      { onAccepted, onSkillCompleted, onConfirmationRequired, onDelta, onCompleted },
      { idempotencyKey: "support_stable-key" }
    );

    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onSkillCompleted).toHaveBeenCalledWith(expect.objectContaining({ skillName: "agent.search" }));
    expect(onConfirmationRequired).toHaveBeenCalledWith(expect.objectContaining({
      confirmationId: "confirm-1",
      skillName: "agent.delete"
    }));
    expect(onDelta).toHaveBeenCalledWith(expect.objectContaining({ delta: "你好" }));
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(authenticatedFetchMock).toHaveBeenCalledWith(
      "/api/support/conversation/messages/stream",
      expect.objectContaining({
        timeoutMs: 0,
        headers: expect.objectContaining({ "Idempotency-Key": "support_stable-key" })
      })
    );
  });

  it("confirms or cancels with only the opaque confirmation id", async () => {
    postMock
      .mockResolvedValueOnce({ data: { data: { confirmationId: "confirm/a", status: "EXECUTED" } } })
      .mockResolvedValueOnce({ data: { data: { confirmationId: "confirm-b", status: "CANCELLED" } } });

    await expect(confirmSupportAction("confirm/a")).resolves.toEqual(
      expect.objectContaining({ status: "EXECUTED" })
    );
    await expect(cancelSupportAction("confirm-b")).resolves.toEqual(
      expect.objectContaining({ status: "CANCELLED" })
    );

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      "/api/support/confirmations/confirm%2Fa/confirm",
      {},
      { signal: undefined }
    );
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      "/api/support/confirmations/confirm-b/cancel",
      {},
      { signal: undefined }
    );
  });

  it("rejects a stream that ends without a completed event", async () => {
    authenticatedFetchMock.mockResolvedValue(sseResponse(
      "event: delta\ndata: {\"turnId\":\"turn-1\",\"delta\":\"半截\"}\n\n"
    ));

    await expect(streamSupportMessage({ content: "你好" }, {}))
      .rejects.toThrow("客服连接在回答完成前中断");
  });
});
