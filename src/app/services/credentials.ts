import { extractPagedResponseData, http } from "@/app/services/http";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
import type {
  CreateCredentialPayload,
  Credential,
  UpdateCredentialPayload
} from "@/app/types/credential";

export async function listCredentials(page = 0, size = 20) {
  const response = await http.get<ApiResponse<PagedResponse<Credential>>>("/api/credentials", {
    params: { page, size }
  });
  return extractPagedResponseData(response);
}

export async function createCredential(payload: CreateCredentialPayload) {
  const response = await http.post<ApiResponse<Credential>>("/api/credentials", payload);
  return response.data.data;
}

export async function updateCredential(id: number, payload: UpdateCredentialPayload) {
  const response = await http.put<ApiResponse<Credential>>(`/api/credentials/${id}`, payload);
  return response.data.data;
}

export async function deleteCredential(id: number) {
  await http.delete<ApiResponse<null>>(`/api/credentials/${id}`);
}
