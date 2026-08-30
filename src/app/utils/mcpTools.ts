import type { McpServer, McpTool } from "@/app/types/mcp";

export interface McpToolOption {
  label: string;
  value: string;
  disabled: boolean;
}

export type McpCatalogState = "NO_SERVER" | "EMPTY" | "NO_ENABLED_TOOL" | "READY";

export interface McpToolInputField {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export function buildMcpToolOptions(tools: McpTool[], servers: McpServer[]): McpToolOption[] {
  const serverEnabledById = new Map(servers.map((server) => [server.id, server.enabled]));

  return tools.map((tool) => {
    const serverEnabled = serverEnabledById.get(tool.serverId) ?? false;
    const disabled = !tool.enabled || !serverEnabled;
    const status = !serverEnabled ? " · Server 已停用" : !tool.enabled ? " · 工具已停用" : "";
    return {
      label: `${tool.name} (${tool.serverName})${status}`,
      value: String(tool.id),
      disabled,
    };
  });
}

export function getMcpCatalogState(tools: McpTool[], servers: McpServer[]): McpCatalogState {
  if (servers.length === 0) {
    return "NO_SERVER";
  }
  if (tools.length === 0) {
    return "EMPTY";
  }
  return buildMcpToolOptions(tools, servers).some((option) => !option.disabled)
    ? "READY"
    : "NO_ENABLED_TOOL";
}

export function parseMcpToolInputSchema(inputSchemaJson?: string | null): McpToolInputField[] {
  if (!inputSchemaJson) return [];
  try {
    const schema = JSON.parse(inputSchemaJson) as {
      properties?: Record<string, { type?: unknown; description?: unknown }>;
      required?: unknown;
    };
    if (!schema.properties || typeof schema.properties !== "object") return [];
    const required = new Set(Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === "string")
      : []);
    return Object.entries(schema.properties).map(([name, property]) => ({
      name,
      type: typeof property?.type === "string" ? property.type : "any",
      description: typeof property?.description === "string" ? property.description : "",
      required: required.has(name),
    }));
  } catch {
    return [];
  }
}
