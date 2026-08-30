import { describe, expect, it } from "vitest";
import type { McpServer, McpTool } from "@/app/types/mcp";
import { buildMcpToolOptions, getMcpCatalogState, parseMcpToolInputSchema } from "@/app/utils/mcpTools";

function server(overrides: Partial<McpServer> = {}): McpServer {
  return {
    id: 1,
    tenantId: 12,
    name: "DingTalk",
    description: null,
    baseUrl: "https://example.invalid/mcp",
    transportType: "STREAMABLE_HTTP",
    authType: "NONE",
    credentialId: null,
    credentialName: null,
    enabled: true,
    toolCount: 1,
    lastSyncedAt: null,
    createdAt: "2026-08-11T00:00:00Z",
    updatedAt: "2026-08-11T00:00:00Z",
    ...overrides,
  };
}

function tool(overrides: Partial<McpTool> = {}): McpTool {
  return {
    id: 8,
    tenantId: 12,
    serverId: 1,
    serverName: "DingTalk",
    name: "send_message",
    description: null,
    inputSchemaJson: null,
    riskLevel: "HIGH",
    enabled: true,
    createdAt: "2026-08-11T00:00:00Z",
    updatedAt: "2026-08-11T00:00:00Z",
    ...overrides,
  };
}

describe("MCP tool catalog for workflow nodes", () => {
  it("keeps disabled tools visible but prevents selecting them", () => {
    expect(buildMcpToolOptions([tool({ enabled: false })], [server()])).toEqual([{
      label: "send_message (DingTalk) · 工具已停用",
      value: "8",
      disabled: true,
    }]);
  });

  it("prevents selecting a tool when its server is disabled", () => {
    expect(buildMcpToolOptions([tool()], [server({ enabled: false })])[0]).toMatchObject({
      disabled: true,
      label: expect.stringContaining("Server 已停用"),
    });
  });

  it("distinguishes a configured server with an unsynchronised empty catalog", () => {
    expect(getMcpCatalogState([], [server({ toolCount: 0 })])).toBe("EMPTY");
  });

  it("reports ready only when at least one selectable tool exists", () => {
    expect(getMcpCatalogState([tool()], [server()])).toBe("READY");
    expect(getMcpCatalogState([tool({ enabled: false })], [server()])).toBe("NO_ENABLED_TOOL");
  });

  it("extracts MCP input fields without failing on an invalid schema", () => {
    expect(parseMcpToolInputSchema(JSON.stringify({
      type: "object",
      required: ["message"],
      properties: {
        message: { type: "string", description: "消息正文" },
        count: { type: "integer" },
      },
    }))).toEqual([
      { name: "message", type: "string", description: "消息正文", required: true },
      { name: "count", type: "integer", description: "", required: false },
    ]);
    expect(parseMcpToolInputSchema("not-json")).toEqual([]);
  });
});
