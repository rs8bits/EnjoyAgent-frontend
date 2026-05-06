import { http } from "@/app/services/http";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
import type {
  AgentToolBinding,
  ConnectMcpOAuthClientCredentialsPayload,
  CreateMcpServerPayload,
  ListMcpToolCallLogsQuery,
  McpOAuthAuthorization,
  McpOAuthConnection,
  McpServer,
  McpTool,
  McpToolCallLog,
  ReplaceAgentToolBindingsPayload,
  ReplaceMcpServerToolsPayload,
  StartMcpOAuthAuthorizationPayload,
  UpdateMcpServerPayload
} from "@/app/types/mcp";

export async function listMcpServers(page = 0, size = 20) {
  const response = await http.get<PagedResponse<McpServer>>("/api/mcp/servers", { params: { page, size } });
  return response.data;
}

export async function createMcpServer(payload: CreateMcpServerPayload) {
  const response = await http.post<ApiResponse<McpServer>>("/api/mcp/servers", payload);
  return response.data.data;
}

export async function updateMcpServer(id: number, payload: UpdateMcpServerPayload) {
  const response = await http.put<ApiResponse<McpServer>>(`/api/mcp/servers/${id}`, payload);
  return response.data.data;
}

export async function deleteMcpServer(id: number) {
  await http.delete<ApiResponse<null>>(`/api/mcp/servers/${id}`);
}

export async function syncMcpServerTools(id: number) {
  const response = await http.post<ApiResponse<McpTool[]>>(`/api/mcp/servers/${id}/sync-tools`);
  return response.data.data;
}

export async function replaceMcpServerTools(id: number, payload: ReplaceMcpServerToolsPayload) {
  const response = await http.put<ApiResponse<McpTool[]>>(`/api/mcp/servers/${id}/tools`, payload);
  return response.data.data;
}

export async function listMcpTools(serverId?: number, page = 0, size = 20) {
  const response = await http.get<PagedResponse<McpTool>>("/api/mcp/tools", {
    params: { ...(serverId ? { serverId } : {}), page, size }
  });
  return response.data;
}

export async function listAgentToolBindings(agentId: number, page = 0, size = 20) {
  const response = await http.get<PagedResponse<AgentToolBinding>>(`/api/agents/${agentId}/tool-bindings`, { params: { page, size } });
  return response.data;
}

export async function replaceAgentToolBindings(agentId: number, payload: ReplaceAgentToolBindingsPayload) {
  const response = await http.put<ApiResponse<AgentToolBinding[]>>(`/api/agents/${agentId}/tool-bindings`, payload);
  return response.data.data;
}

export async function listMcpToolCallLogs(query: ListMcpToolCallLogsQuery = {}) {
  const response = await http.get<ApiResponse<McpToolCallLog[]>>("/api/mcp/tool-call-logs", {
    params: query
  });
  return response.data.data;
}

export async function getMcpOAuthConnection(serverId: number) {
  const response = await http.get<ApiResponse<McpOAuthConnection>>(`/api/mcp/servers/${serverId}/oauth/connection`);
  return response.data.data;
}

export async function startMcpOAuthAuthorization(serverId: number, payload: StartMcpOAuthAuthorizationPayload) {
  const response = await http.post<ApiResponse<McpOAuthAuthorization>>(`/api/mcp/servers/${serverId}/oauth/authorize`, payload);
  return response.data.data;
}

export async function connectMcpOAuthClientCredentials(serverId: number, payload: ConnectMcpOAuthClientCredentialsPayload) {
  const response = await http.post<ApiResponse<McpOAuthConnection>>(
    `/api/mcp/servers/${serverId}/oauth/connect-client-credentials`,
    payload
  );
  return response.data.data;
}

export async function disconnectMcpOAuthConnection(serverId: number) {
  await http.delete<ApiResponse<null>>(`/api/mcp/servers/${serverId}/oauth/connection`);
}
