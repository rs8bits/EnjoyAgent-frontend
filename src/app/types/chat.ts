export interface ChatSession {
  id: number;
  tenantId: number;
  agentId: number;
  agentName: string;
  title: string;
  createdByUserId: number;
  createdByDisplayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  role: "USER" | "ASSISTANT" | string;
  content: string;
  createdAt: string;
}

export interface RetrievedKnowledgeChunk {
  chunkId: number;
  documentId: number;
  documentName: string;
  chunkIndex: number;
  recallScore: number | null;
  recallRank: number | null;
  denseScore: number | null;
  denseRank: number | null;
  lexicalScore: number | null;
  lexicalRank: number | null;
  matchedBy: string | null;
  rerankScore: number | null;
  rerankRank: number | null;
  selected: boolean;
  content: string;
}

export interface KnowledgeRetrievalDebug {
  knowledgeBaseId: number | null;
  knowledgeBaseName: string | null;
  originalQuery: string | null;
  retrievalQuery: string | null;
  rewriteApplied: boolean;
  recallTopK: number | null;
  finalTopK: number | null;
  rerankApplied: boolean;
  rerankModel: string | null;
  hits: RetrievedKnowledgeChunk[];
}

export interface ChatTurn {
  sessionId: number;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  provider: string;
  modelName: string;
  credentialSource: string;
  credentialId: number | null;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  retrievalDebug: KnowledgeRetrievalDebug | null;
}

export interface CreateChatSessionPayload {
  agentId: number;
  title?: string;
}

export interface SendChatMessagePayload {
  content: string;
  toolApprovalTokens?: string[];
}

export interface ChatStreamStarted {
  sessionId: number;
  userMessageId: number;
  userMessageContent: string;
  provider: string;
  modelName: string;
  credentialSource: string;
  credentialId: number | null;
  mode: "STREAM" | "SYNC_FALLBACK" | string;
}

export interface ChatStreamDelta {
  delta: string;
}
