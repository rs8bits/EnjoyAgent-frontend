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
