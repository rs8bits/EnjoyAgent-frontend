import { extractPagedResponseData, http } from "@/app/services/http";
import type { UserWallet } from "@/app/types/billing";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
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

export async function listAdminOfficialModelCredentials(page = 0, size = 20, signal?: AbortSignal) {
  const response = await http.get<ApiResponse<PagedResponse<OfficialModelCredential>>>(
    "/api/admin/official-models/credentials",
    { params: { page, size }, signal }
  );
  return extractPagedResponseData(response);
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

export async function listAdminOfficialModelConfigs(page = 0, size = 20, signal?: AbortSignal) {
  const response = await http.get<ApiResponse<PagedResponse<OfficialModelConfig>>>(
    "/api/admin/official-models/configs",
    { params: { page, size }, signal }
  );
  return extractPagedResponseData(response);
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

export async function listAdminRechargeOrders(status?: string, page = 0, size = 20, signal?: AbortSignal) {
  const response = await http.get<ApiResponse<PagedResponse<RechargeOrder>>>(
    "/api/admin/billing/recharge-orders",
    {
      params: { ...(status ? { status } : {}), page, size },
      signal
    }
  );
  return extractPagedResponseData(response);
}

export async function approveAdminRechargeOrder(id: number, payload: ReviewRemarkPayload) {
  const response = await http.post<ApiResponse<RechargeOrder>>(`/api/admin/billing/recharge-orders/${id}/approve`, payload);
  return response.data.data;
}

export async function rejectAdminRechargeOrder(id: number, payload: ReviewRemarkPayload) {
  const response = await http.post<ApiResponse<RechargeOrder>>(`/api/admin/billing/recharge-orders/${id}/reject`, payload);
  return response.data.data;
}

export async function getAdminUserWallet(userId: number, signal?: AbortSignal) {
  const response = await http.get<ApiResponse<UserWallet>>(`/api/admin/billing/users/${userId}/wallet`, { signal });
  return response.data.data;
}

export async function adjustAdminUserWallet(userId: number, payload: AdjustUserWalletPayload) {
  const response = await http.post<ApiResponse<UserWallet>>(`/api/admin/billing/users/${userId}/wallet/adjust`, payload);
  return response.data.data;
}

export async function listAdminMarketAssets(
  assetType?: MarketAssetType,
  status?: MarketAssetStatus,
  page = 0,
  size = 20,
  signal?: AbortSignal
) {
  const response = await http.get<ApiResponse<PagedResponse<MarketAsset>>>("/api/admin/market/assets", {
    params: {
      assetType: assetType || undefined,
      status: status || undefined,
      page,
      size
    },
    signal
  });
  return extractPagedResponseData(response);
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
