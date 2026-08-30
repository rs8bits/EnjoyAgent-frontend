import type { CredentialProvider } from "@/app/types/credential";

export type ModelType = "CHAT" | "EMBEDDING" | "RERANK";
export type ModelCredentialSource = "USER" | "PLATFORM";

export interface ModelConfig {
  id: number;
  tenantId: number;
  name: string;
  provider: CredentialProvider | string;
  modelType: ModelType | string;
  modelName: string;
  credentialSource: ModelCredentialSource | string;
  credentialId: number | null;
  credentialName: string | null;
  temperature: string | number | null;
  maxTokens: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModelConfigPayload {
  name: string;
  provider: CredentialProvider;
  modelType: ModelType;
  modelName: string;
  credentialSource: ModelCredentialSource;
  credentialId?: number;
  temperature?: number;
  maxTokens?: number;
  enabled?: boolean;
}

export interface UpdateModelConfigPayload extends CreateModelConfigPayload {
  enabled: boolean;
}

export interface OfficialModelConfig {
  id: number;
  name: string;
  provider: CredentialProvider | string;
  modelType: ModelType | string;
  modelName: string;
  officialCredentialId: number;
  officialCredentialName: string;
  temperature: string | number | null;
  maxTokens: number | null;
  inputPricePerMillion: string | null;
  outputPricePerMillion: string | null;
  currency: string | null;
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
