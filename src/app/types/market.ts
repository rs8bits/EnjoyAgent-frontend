export type MarketAssetType = "AGENT" | "KNOWLEDGE_BASE" | "MCP_SERVER" | string;
export type MarketAssetStatus = "PENDING" | "APPROVED" | "REJECTED" | "OFFLINE" | string;

export interface MarketAsset {
  id: number;
  assetType: MarketAssetType;
  sourceEntityId: number;
  name: string;
  summary: string | null;
  description: string | null;
  status: MarketAssetStatus;
  submitterUserId: number;
  submitterDisplayName: string | null;
  reviewedByUserId: number | null;
  reviewedByDisplayName: string | null;
  reviewedAt: string | null;
  reviewRemark: string | null;
  publishedAt: string | null;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketInstalledResource {
  resourceType: string;
  id: number;
  name: string;
}

export interface MarketAssetInstallResult {
  marketAssetId: number;
  assetType: MarketAssetType;
  installedEntityId: number;
  installedName: string;
  relatedResources: MarketInstalledResource[];
  setupRequired: boolean;
  setupItems: string[];
}

export interface SubmitMarketAssetPayload {
  summary?: string;
  description?: string;
}

export interface InstallMarketAssetPayload {
  name?: string;
  targetModelConfigId?: number;
  targetOfficialModelConfigId?: number;
  targetKnowledgeBaseId?: number;
  targetRerankModelConfigId?: number;
  targetEmbeddingModelConfigId?: number;
  targetCredentialId?: number;
  enabled?: boolean;
}
