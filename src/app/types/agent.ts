export type AgentChatModelBindingType = "USER_MODEL" | "OFFICIAL_MODEL";
export type ContextStrategy = "SLIDING_WINDOW";
export type MemoryStrategy = "SESSION_SUMMARY";

export interface Agent {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  systemPrompt: string;
  chatModelBindingType: AgentChatModelBindingType | string;
  modelConfigId: number | null;
  modelConfigName: string | null;
  officialModelConfigId: number | null;
  officialModelConfigName: string | null;
  knowledgeBaseId: number | null;
  knowledgeBaseName: string | null;
  rerankEnabled: boolean;
  rerankModelConfigId: number | null;
  rerankModelConfigName: string | null;
  contextStrategy: ContextStrategy | string;
  contextWindowSize: number;
  memoryEnabled: boolean;
  memoryStrategy: MemoryStrategy | string | null;
  memoryUpdateMessageThreshold: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentPayload {
  name: string;
  description?: string;
  systemPrompt: string;
  chatModelBindingType: AgentChatModelBindingType;
  modelConfigId?: number;
  officialModelConfigId?: number;
  knowledgeBaseId?: number;
  rerankEnabled?: boolean;
  rerankModelConfigId?: number;
  contextStrategy: ContextStrategy;
  contextWindowSize: number;
  memoryEnabled?: boolean;
  memoryStrategy?: MemoryStrategy;
  memoryUpdateMessageThreshold?: number;
  enabled?: boolean;
}

export interface UpdateAgentPayload extends CreateAgentPayload {
  rerankEnabled: boolean;
  memoryEnabled: boolean;
  enabled: boolean;
}
