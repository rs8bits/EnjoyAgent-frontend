import { extractPagedResponseData, http } from "@/app/services/http";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
import type {
  CreateModelConfigPayload,
  ModelConfig,
  OfficialModelConfig,
  UpdateModelConfigPayload
} from "@/app/types/model";

export async function listModelConfigs(page = 0, size = 20) {
  const response = await http.get<ApiResponse<PagedResponse<ModelConfig>>>("/api/model-configs", {
    params: { page, size }
  });
  return extractPagedResponseData(response);
}

export async function createModelConfig(payload: CreateModelConfigPayload) {
  const response = await http.post<ApiResponse<ModelConfig>>("/api/model-configs", payload);
  return response.data.data;
}

export async function updateModelConfig(id: number, payload: UpdateModelConfigPayload) {
  const response = await http.put<ApiResponse<ModelConfig>>(`/api/model-configs/${id}`, payload);
  return response.data.data;
}

export async function deleteModelConfig(id: number) {
  await http.delete<ApiResponse<null>>(`/api/model-configs/${id}`);
}

export async function listOfficialModelConfigs(page = 0, size = 20) {
  const response = await http.get<ApiResponse<PagedResponse<OfficialModelConfig>>>(
    "/api/official-model-configs",
    { params: { page, size } }
  );
  return extractPagedResponseData(response);
}
