export interface KnowledgeBase {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  embeddingModelConfigId: number;
  embeddingModelConfigName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: number;
  knowledgeBaseId: number;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
  status: string;
  chunkCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeBasePayload {
  name: string;
  description?: string;
  embeddingModelConfigId: number;
  enabled?: boolean;
}

export interface UpdateKnowledgeBasePayload extends CreateKnowledgeBasePayload {
  enabled: boolean;
}
