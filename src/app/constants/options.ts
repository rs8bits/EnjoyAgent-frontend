export const credentialProviderOptions = [
  { label: "阿里百炼", value: "DASHSCOPE" },
  { label: "OpenAI", value: "OPENAI" }
] as const;

export const modelTypeOptions = [
  { label: "对话模型", value: "CHAT" },
  { label: "Embedding 模型", value: "EMBEDDING" },
  { label: "Rerank 模型", value: "RERANK" }
] as const;

export const agentModelBindingOptions = [
  { label: "用户模型", value: "USER_MODEL" },
  { label: "官方模型", value: "OFFICIAL_MODEL" }
] as const;

export const credentialStatusOptions = [
  { label: "启用", value: "ACTIVE" },
  { label: "停用", value: "DISABLED" }
] as const;

export const booleanSwitchOptions = [
  { label: "启用", value: "true" },
  { label: "关闭", value: "false" }
] as const;

export const mcpTransportOptions = [
  { label: "Streamable HTTP", value: "STREAMABLE_HTTP" },
  { label: "SSE", value: "SSE" }
] as const;

export const mcpAuthOptions = [
  { label: "无需认证", value: "NONE" },
  { label: "静态 Bearer", value: "STATIC_BEARER" },
  { label: "OAuth 授权码", value: "OAUTH_AUTH_CODE" },
  { label: "OAuth 客户端凭证", value: "OAUTH_CLIENT_CREDENTIALS" }
] as const;

export const mcpToolRiskOptions = [
  { label: "低风险", value: "LOW" },
  { label: "中风险", value: "MEDIUM" },
  { label: "高风险", value: "HIGH" }
] as const;
