import axios from "axios";
import type { AxiosResponse } from "axios";
import type { ApiErrorPayload, ApiResponse, PagedResponse } from "@/app/types/api";

let unauthorizedHandler: (() => void | Promise<void>) | null = null;
let unauthorizedPromise: Promise<void> | null = null;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 20_000,
  withCredentials: true
});

async function handleUnauthorized() {
  if (!unauthorizedPromise) {
    unauthorizedPromise = Promise.resolve(unauthorizedHandler?.()).finally(() => {
      unauthorizedPromise = null;
    });
  }
  try {
    await unauthorizedPromise;
  } catch {
    // Authentication state has already been cleared; keep the original HTTP error observable.
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

export function setHttpUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
  unauthorizedHandler = handler;
}

export function joinApiUrl(baseUrl: string, path: string) {
  if (!baseUrl) {
    return path;
  }
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function resolveApiUrl(path: string) {
  return joinApiUrl(apiBaseUrl, path);
}

interface AuthenticatedFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function authenticatedFetch(path: string, options: AuthenticatedFetchOptions = {}) {
  const { timeoutMs = 20_000, signal, headers, ...requestInit } = options;
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (signal?.aborted) {
    controller.abort(signal.reason);
  }
  const timeoutId = timeoutMs > 0
    ? globalThis.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : null;

  try {
    const response = await fetch(resolveApiUrl(path), {
      ...requestInit,
      credentials: "include",
      headers,
      signal: controller.signal
    });
    if (response.status === 401) {
      await handleUnauthorized();
    }
    return response;
  } catch (error) {
    if (timedOut) {
      throw new Error("请求超时，请稍后重试。");
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export function isRequestCanceled(error: unknown) {
  return axios.isCancel(error)
    || (error instanceof DOMException && error.name === "AbortError")
    || (error instanceof Error && error.name === "AbortError");
}

export async function extractFetchErrorMessage(response: Response, fallback = "请求失败") {
  try {
    const errorBody = await response.json() as ApiResponse<ApiErrorPayload>;
    return errorBody?.data?.message || errorBody?.message || fallback;
  } catch {
    return fallback;
  }
}

export function extractPagedResponseData<T>(
  response: AxiosResponse<ApiResponse<PagedResponse<T>>>
) {
  return response.data.data;
}

export function extractApiErrorMessage(error: unknown, fallback = "Request failed") {
  if (!axios.isAxiosError<ApiResponse<ApiErrorPayload>>(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  const axiosError = error;
  if (axiosError.response?.status === 413) {
    return "上传文件过大，请控制在服务端允许的大小范围内后重试。";
  }
  if (axiosError.response?.status === 415) {
    return "文件类型暂不支持，当前版本只支持 TXT、Markdown、PDF。";
  }
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
