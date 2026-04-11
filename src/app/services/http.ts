import axios from "axios";
import type { AxiosError } from "axios";
import type { ApiErrorPayload, ApiResponse } from "@/app/types/api";

let accessToken: string | null = null;

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 20_000
});

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export function setHttpAccessToken(token: string | null) {
  accessToken = token;
}

export function getHttpAccessToken() {
  return accessToken;
}

export function extractApiErrorMessage(error: unknown, fallback = "Request failed") {
  const axiosError = error as AxiosError<ApiResponse<ApiErrorPayload>>;
  if (axiosError.code === "ECONNABORTED") {
    return "请求超时，文档处理可能仍在进行中，请稍后刷新查看。";
  }
  if (axiosError.message === "Network Error") {
    return "网络连接失败，请确认前端开发服务和后端服务都在运行。";
  }
  return axiosError.response?.data?.data?.message
    || axiosError.response?.data?.message
    || axiosError.message
    || fallback;
}
