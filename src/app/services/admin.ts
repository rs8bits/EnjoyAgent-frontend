import { http } from "@/app/services/http";
import type { UserWallet } from "@/app/types/billing";
import type { ApiResponse } from "@/app/types/api";
import type {
  AdjustUserWalletPayload,
  CreateOfficialModelConfigPayload,
  CreateOfficialModelCredentialPayload,
  MarketAsset,
  MarketAssetStatus,
  MarketAssetType,
  OfficialModelConfig,
  OfficialModelCredential,
  RechargeOrder,
  ReviewRemarkPayload,
  UpdateOfficialModelConfigPayload,
  UpdateOfficialModelCredentialPayload
} from "@/app/types/admin";

export async function listAdminOfficialModelCredentials() {
  const response = await http.get<ApiResponse<OfficialModelCredential[]>>("/api/admin/official-models/credentials");
  return response.data.data;
}

export async function createAdminOfficialModelCredential(payload: CreateOfficialModelCredentialPayload) {
  const response = await http.post<ApiResponse<OfficialModelCredential>>("/api/admin/official-models/credentials", payload);
  return response.data.data;
}

export async function updateAdminOfficialModelCredential(id: number, payload: UpdateOfficialModelCredentialPayload) {
  const response = await http.put<ApiResponse<OfficialModelCredential>>(`/api/admin/official-models/credentials/${id}`, payload);
  return response.data.data;
}

export async function deleteAdminOfficialModelCredential(id: number) {
  await http.delete<ApiResponse<null>>(`/api/admin/official-models/credentials/${id}`);
}

export async function listAdminOfficialModelConfigs() {
  const response = await http.get<ApiResponse<OfficialModelConfig[]>>("/api/admin/official-models/configs");
  return response.data.data;
}

export async function createAdminOfficialModelConfig(payload: CreateOfficialModelConfigPayload) {
  const response = await http.post<ApiResponse<OfficialModelConfig>>("/api/admin/official-models/configs", payload);
  return response.data.data;
}

export async function updateAdminOfficialModelConfig(id: number, payload: UpdateOfficialModelConfigPayload) {
  const response = await http.put<ApiResponse<OfficialModelConfig>>(`/api/admin/official-models/configs/${id}`, payload);
  return response.data.data;
}

export async function deleteAdminOfficialModelConfig(id: number) {
  await http.delete<ApiResponse<null>>(`/api/admin/official-models/configs/${id}`);
}

export async function listAdminRechargeOrders(status?: string) {
  const response = await http.get<ApiResponse<RechargeOrder[]>>("/api/admin/billing/recharge-orders", {
    params: status ? { status } : undefined
  });
  return response.data.data;
}

export async function approveAdminRechargeOrder(id: number, payload: ReviewRemarkPayload) {
  const response = await http.post<ApiResponse<RechargeOrder>>(`/api/admin/billing/recharge-orders/${id}/approve`, payload);
  return response.data.data;
}

export async function rejectAdminRechargeOrder(id: number, payload: ReviewRemarkPayload) {
  const response = await http.post<ApiResponse<RechargeOrder>>(`/api/admin/billing/recharge-orders/${id}/reject`, payload);
  return response.data.data;
}

export async function getAdminUserWallet(userId: number) {
  const response = await http.get<ApiResponse<UserWallet>>(`/api/admin/billing/users/${userId}/wallet`);
  return response.data.data;
}

export async function adjustAdminUserWallet(userId: number, payload: AdjustUserWalletPayload) {
  const response = await http.post<ApiResponse<UserWallet>>(`/api/admin/billing/users/${userId}/wallet/adjust`, payload);
  return response.data.data;
}

export async function listAdminMarketAssets(assetType?: MarketAssetType, status?: MarketAssetStatus) {
  const response = await http.get<ApiResponse<MarketAsset[]>>("/api/admin/market/assets", {
    params: {
      assetType: assetType || undefined,
      status: status || undefined
    }
  });
  return response.data.data;
}

export async function approveAdminMarketAsset(id: number, payload: ReviewRemarkPayload) {
  const response = await http.post<ApiResponse<MarketAsset>>(`/api/admin/market/assets/${id}/approve`, payload);
  return response.data.data;
}

export async function rejectAdminMarketAsset(id: number, payload: ReviewRemarkPayload) {
  const response = await http.post<ApiResponse<MarketAsset>>(`/api/admin/market/assets/${id}/reject`, payload);
  return response.data.data;
}

export async function offlineAdminMarketAsset(id: number, payload: ReviewRemarkPayload) {
  const response = await http.post<ApiResponse<MarketAsset>>(`/api/admin/market/assets/${id}/offline`, payload);
  return response.data.data;
}
