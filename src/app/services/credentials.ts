import { http } from "@/app/services/http";
import type { ApiResponse } from "@/app/types/api";
import type {
  CreateCredentialPayload,
  Credential,
  UpdateCredentialPayload
} from "@/app/types/credential";

export async function listCredentials() {
  const response = await http.get<ApiResponse<Credential[]>>("/api/credentials");
  return response.data.data;
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
