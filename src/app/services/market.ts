import { http } from "@/app/services/http";
import type { ApiResponse } from "@/app/types/api";
import type {
  InstallMarketAssetPayload,
  MarketAsset,
  MarketAssetInstallResult,
  MarketAssetType,
  SubmitMarketAssetPayload
} from "@/app/types/market";

export async function listMyMarketSubmissions() {
  const response = await http.get<ApiResponse<MarketAsset[]>>("/api/market/submissions");
  return response.data.data;
}

export async function listPublishedMarketAssets(assetType?: MarketAssetType) {
  const response = await http.get<ApiResponse<MarketAsset[]>>("/api/market/assets", {
    params: assetType ? { assetType } : undefined
  });
  return response.data.data;
}

export async function getMarketAsset(id: number) {
  const response = await http.get<ApiResponse<MarketAsset>>(`/api/market/assets/${id}`);
  return response.data.data;
}

export async function submitAgentToMarket(agentId: number, payload: SubmitMarketAssetPayload) {
  const response = await http.post<ApiResponse<MarketAsset>>(`/api/market/assets/agents/${agentId}/submit`, payload);
  return response.data.data;
}

export async function submitKnowledgeBaseToMarket(knowledgeBaseId: number, payload: SubmitMarketAssetPayload) {
  const response = await http.post<ApiResponse<MarketAsset>>(
    `/api/market/assets/knowledge-bases/${knowledgeBaseId}/submit`,
    payload
  );
  return response.data.data;
}

export async function submitMcpServerToMarket(serverId: number, payload: SubmitMarketAssetPayload) {
  const response = await http.post<ApiResponse<MarketAsset>>(`/api/market/assets/mcp-servers/${serverId}/submit`, payload);
  return response.data.data;
}

export async function installMarketAsset(id: number, payload: InstallMarketAssetPayload) {
  const response = await http.post<ApiResponse<MarketAssetInstallResult>>(`/api/market/assets/${id}/install`, payload);
  return response.data.data;
}
