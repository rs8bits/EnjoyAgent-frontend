import type { CredentialProvider } from "@/app/types/credential";
import type { RechargeOrder } from "@/app/types/billing";
import type { MarketAsset, MarketAssetStatus, MarketAssetType } from "@/app/types/market";
import type { ModelType, OfficialModelConfig } from "@/app/types/model";

export interface OfficialModelCredential {
  id: number;
  name: string;
  provider: CredentialProvider | string;
  baseUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfficialModelCredentialPayload {
  name: string;
  provider: CredentialProvider;
  baseUrl: string;
  secretPlaintext: string;
  enabled?: boolean;
}

export interface UpdateOfficialModelCredentialPayload {
  name: string;
  baseUrl: string;
  secretPlaintext?: string;
  enabled: boolean;
}

export interface CreateOfficialModelConfigPayload {
  name: string;
  provider: CredentialProvider;
  modelType: ModelType;
  modelName: string;
  officialCredentialId: number;
  temperature?: number;
  maxTokens?: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  currency: string;
  description?: string;
  enabled?: boolean;
}

export interface UpdateOfficialModelConfigPayload extends CreateOfficialModelConfigPayload {
  enabled: boolean;
}

export interface ReviewRemarkPayload {
  reviewRemark?: string;
}

export interface AdjustUserWalletPayload {
  amountDelta: number;
  description?: string;
}

export interface AdminReviewDashboard {
  rechargeOrders: RechargeOrder[];
  marketAssets: MarketAsset[];
  officialCredentials: OfficialModelCredential[];
  officialConfigs: OfficialModelConfig[];
}

export type {
  RechargeOrder,
  MarketAsset,
  MarketAssetStatus,
  MarketAssetType,
  OfficialModelConfig
};
