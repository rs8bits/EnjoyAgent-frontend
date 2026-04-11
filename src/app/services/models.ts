import { http } from "@/app/services/http";
import type { ApiResponse } from "@/app/types/api";
import type {
  CreateModelConfigPayload,
  ModelConfig,
  OfficialModelConfig,
  UpdateModelConfigPayload
} from "@/app/types/model";

export async function listModelConfigs() {
  const response = await http.get<ApiResponse<ModelConfig[]>>("/api/model-configs");
  return response.data.data;
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

export async function listOfficialModelConfigs() {
  const response = await http.get<ApiResponse<OfficialModelConfig[]>>("/api/official-model-configs");
  return response.data.data;
}
