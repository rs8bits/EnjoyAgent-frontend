import { http } from "@/app/services/http";
import type { ApiResponse } from "@/app/types/api";
import type { AuthResponse, CurrentUser, LoginPayload, RegisterPayload } from "@/app/types/auth";

export async function login(payload: LoginPayload) {
  const response = await http.post<ApiResponse<AuthResponse>>("/api/auth/login", payload);
  return response.data.data;
}

export async function register(payload: RegisterPayload) {
  const response = await http.post<ApiResponse<AuthResponse>>("/api/auth/register", payload);
  return response.data.data;
}

export async function fetchCurrentUser() {
  const response = await http.get<ApiResponse<CurrentUser>>("/api/auth/me");
  return response.data.data;
}
