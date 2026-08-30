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
  status: KnowledgeDocumentStatus;
  chunkCount: number | null;
  processingAttempts: number;
  nextRetryAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  processingStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeDocumentStatus =
  | "QUEUED"
  | "PROCESSING"
  | "RETRYING"
  | "INDEXING"
  | "READY"
  | "FAILED"
  | "DELETING";

export interface CreateKnowledgeBasePayload {
  name: string;
  description?: string;
  embeddingModelConfigId: number;
  enabled?: boolean;
}

export interface UpdateKnowledgeBasePayload extends CreateKnowledgeBasePayload {
  enabled: boolean;
}
