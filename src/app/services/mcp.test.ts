import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock, putMock } = vi.hoisted(() => ({ postMock: vi.fn(), putMock: vi.fn() }));

vi.mock("@/app/services/http", () => ({
  extractPagedResponseData: vi.fn(),
  http: { post: postMock, put: putMock }
}));

import {
  approveHighRiskMcpTool,
  replaceAgentToolBindings,
  syncMcpServerTools
} from "@/app/services/mcp";

describe("MCP service contracts", () => {
  beforeEach(() => {
    postMock.mockReset();
    putMock.mockReset();
  });

  it("binds approval issuance to both tool and agent", async () => {
    const approval = {
      toolId: 13,
      agentId: 8,
      approvalToken: "signed-short-lived-token",
      expiresAt: "2026-08-08T12:00:00Z"
    };
    postMock.mockResolvedValue({ data: { data: approval } });

    await expect(approveHighRiskMcpTool(13, 8)).resolves.toEqual(approval);
    expect(postMock).toHaveBeenCalledWith(
      "/api/mcp/tools/13/approvals",
      undefined,
      { params: { agentId: 8 } }
    );
  });

  it("discovers remote tools before they can be bound", async () => {
    const tools = [{ id: 31, name: "remote_tool" }];
    postMock.mockResolvedValue({ data: { data: tools } });

    await expect(syncMcpServerTools(2)).resolves.toEqual(tools);
    expect(postMock).toHaveBeenCalledWith("/api/mcp/servers/2/sync-tools");
  });

  it("replaces an agent binding with the complete selected tool set", async () => {
    const bindings = [{ id: 81, agentId: 7, toolId: 31 }];
    putMock.mockResolvedValue({ data: { data: bindings } });

    await expect(replaceAgentToolBindings(7, { toolIds: [31, 32] })).resolves.toEqual(bindings);
    expect(putMock).toHaveBeenCalledWith(
      "/api/agents/7/tool-bindings",
      { toolIds: [31, 32] }
    );
  });
});
