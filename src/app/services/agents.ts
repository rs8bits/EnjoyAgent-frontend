import { extractPagedResponseData, http } from "@/app/services/http";
import type { Agent, CreateAgentPayload, UpdateAgentPayload } from "@/app/types/agent";
import type { ApiResponse, PagedResponse } from "@/app/types/api";

export async function listAgents(page = 0, size = 20, signal?: AbortSignal, search?: string) {
  const response = await http.get<ApiResponse<PagedResponse<Agent>>>("/api/agents", {
    params: { page, size, search: search?.trim() || undefined },
    signal
  });
  return extractPagedResponseData(response);
}

export async function getAgent(id: number, signal?: AbortSignal) {
  const response = await http.get<ApiResponse<Agent>>(`/api/agents/${id}`, { signal });
  return response.data.data;
}

export async function createAgent(payload: CreateAgentPayload) {
  const response = await http.post<ApiResponse<Agent>>("/api/agents", payload);
  return response.data.data;
}

export async function updateAgent(id: number, payload: UpdateAgentPayload) {
  const response = await http.put<ApiResponse<Agent>>(`/api/agents/${id}`, payload);
  return response.data.data;
}

export async function deleteAgent(id: number) {
  await http.delete<ApiResponse<null>>(`/api/agents/${id}`);
}
