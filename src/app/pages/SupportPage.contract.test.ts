import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./SupportPage.vue", import.meta.url), "utf8");

describe("SupportPage customer-service contract", () => {
  it("uses the implicit singleton conversation and exposes no session creation selector", () => {
    expect(source).toContain("getSupportConversation()");
    expect(source).not.toContain("createSession");
    expect(source).not.toContain("selectedSessionId");
    expect(source).not.toContain("selectedAgentId");
  });

  it("shows confirmation and secret-handling boundaries to users", () => {
    expect(source).toContain("敏感操作需确认");
    expect(source).toContain("API Key 仅展示是否已配置");
    expect(source).toContain("只有在确认卡片中明确确认后才会执行");
    expect(source).toContain("原始工具参数不会发送到浏览器");
  });

  it("renders server-provided confirmation summaries and sends only confirmation ids", () => {
    expect(source).toContain("confirmation.summary");
    expect(source).toContain("confirmation.expiresAt");
    expect(source).toContain("confirmSupportAction(confirmation.confirmationId");
    expect(source).toContain("cancelSupportAction(confirmation.confirmationId");
    expect(source).toContain("listPendingSupportConfirmations()");
  });
});
