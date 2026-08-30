export type McpTransportType = "STREAMABLE_HTTP" | "SSE" | string;
export type McpAuthType = "NONE" | "STATIC_BEARER" | "OAUTH_AUTH_CODE" | "OAUTH_CLIENT_CREDENTIALS" | string;
export type McpToolRiskLevel = "LOW" | "MEDIUM" | "HIGH" | string;
export type McpToolCallStatus = "SUCCESS" | "FAILED" | string;
export type McpOAuthConnectionStatus = "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "ERROR" | string;

export interface McpServer {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  baseUrl: string;
  transportType: McpTransportType;
  authType: McpAuthType;
  credentialId: number | null;
  credentialName: string | null;
  enabled: boolean;
  toolCount: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface McpTool {
  id: number;
  tenantId: number;
  serverId: number;
  serverName: string;
  name: string;
  description: string | null;
  inputSchemaJson: string | null;
  riskLevel: McpToolRiskLevel;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentToolBinding {
  id: number;
  tenantId: number;
  agentId: number;
  toolId: number;
  toolName: string;
  serverId: number;
  serverName: string;
  riskLevel: McpToolRiskLevel;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface McpToolCallLog {
  id: number;
  agentId: number | null;
  sessionId: number | null;
  serverId: number | null;
  toolId: number | null;
  toolCallId: string | null;
  toolName: string;
  status: McpToolCallStatus;
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestPayload: string | null;
  responsePayload: string | null;
  createdAt: string;
}

export interface McpToolApproval {
  toolId: number;
  agentId: number;
  approvalToken: string;
  expiresAt: string;
}

export interface McpOAuthAuthorization {
  status: McpOAuthConnectionStatus;
  authorizationUrl: string;
  resourceMetadataUrl: string | null;
  authorizationServerIssuer: string | null;
  authorizationExpiresAt: string | null;
}

export interface McpOAuthConnection {
  serverId: number;
  status: McpOAuthConnectionStatus;
  connected: boolean;
  resourceMetadataUrl: string | null;
  authorizationServerIssuer: string | null;
  authorizationEndpoint: string | null;
  tokenEndpoint: string | null;
  clientId: string | null;
  requestedScopes: string | null;
  grantedScopes: string | null;
  tokenType: string | null;
  expiresAt: string | null;
  lastAuthorizedAt: string | null;
  lastTokenRefreshedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface CreateMcpServerPayload {
  name: string;
  description?: string;
  baseUrl: string;
  transportType: McpTransportType;
  authType?: McpAuthType;
  credentialId?: number;
  enabled?: boolean;
}

export interface UpdateMcpServerPayload extends CreateMcpServerPayload {
  enabled: boolean;
}

export interface UpsertMcpToolPayload {
  name: string;
  description?: string;
  inputSchemaJson?: string;
  riskLevel?: McpToolRiskLevel;
  enabled?: boolean;
}

export interface ReplaceMcpServerToolsPayload {
  tools: UpsertMcpToolPayload[];
}

export interface ReplaceAgentToolBindingsPayload {
  toolIds: number[];
}

export interface StartMcpOAuthAuthorizationPayload {
  clientId: string;
  clientSecret?: string;
  scope?: string;
}

export interface ConnectMcpOAuthClientCredentialsPayload {
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export interface ListMcpToolCallLogsQuery {
  sessionId?: number;
  agentId?: number;
  status?: McpToolCallStatus;
  limit?: number;
}
