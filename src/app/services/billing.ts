import { http } from "@/app/services/http";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
import type {
  CreateRechargeOrderPayload,
  RechargeOrder,
  UserWallet,
  UserWalletTransaction
} from "@/app/types/billing";

export async function getCurrentWallet() {
  const response = await http.get<ApiResponse<UserWallet>>("/api/wallet");
  return response.data.data;
}

export async function listWalletTransactions(page = 0, size = 20) {
  const response = await http.get<PagedResponse<UserWalletTransaction>>("/api/wallet/transactions", { params: { page, size } });
  return response.data;
}

export async function createRechargeOrder(payload: CreateRechargeOrderPayload) {
  const response = await http.post<ApiResponse<RechargeOrder>>("/api/recharge-orders", payload);
  return response.data.data;
}

export async function listRechargeOrders(page = 0, size = 20) {
  const response = await http.get<PagedResponse<RechargeOrder>>("/api/recharge-orders", { params: { page, size } });
  return response.data;
}

export async function getRechargeOrder(id: number) {
  const response = await http.get<ApiResponse<RechargeOrder>>(`/api/recharge-orders/${id}`);
  return response.data.data;
}
