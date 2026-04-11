import { http } from "@/app/services/http";
import type { ApiResponse } from "@/app/types/api";
import type {
  CreateKnowledgeBasePayload,
  KnowledgeBase,
  KnowledgeDocument,
  UpdateKnowledgeBasePayload
} from "@/app/types/knowledge";

export async function listKnowledgeBases() {
  const response = await http.get<ApiResponse<KnowledgeBase[]>>("/api/knowledge-bases");
  return response.data.data;
}

export async function getKnowledgeBase(id: number) {
  const response = await http.get<ApiResponse<KnowledgeBase>>(`/api/knowledge-bases/${id}`);
  return response.data.data;
}

export async function createKnowledgeBase(payload: CreateKnowledgeBasePayload) {
  const response = await http.post<ApiResponse<KnowledgeBase>>("/api/knowledge-bases", payload);
  return response.data.data;
}

export async function updateKnowledgeBase(id: number, payload: UpdateKnowledgeBasePayload) {
  const response = await http.put<ApiResponse<KnowledgeBase>>(`/api/knowledge-bases/${id}`, payload);
  return response.data.data;
}

export async function deleteKnowledgeBase(id: number) {
  await http.delete<ApiResponse<null>>(`/api/knowledge-bases/${id}`);
}

export async function listKnowledgeDocuments(knowledgeBaseId: number) {
  const response = await http.get<ApiResponse<KnowledgeDocument[]>>(`/api/knowledge-bases/${knowledgeBaseId}/documents`);
  return response.data.data;
}

export async function uploadKnowledgeDocument(knowledgeBaseId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await http.post<ApiResponse<KnowledgeDocument>>(
    `/api/knowledge-bases/${knowledgeBaseId}/documents`,
    formData,
    {
      timeout: 300_000
    }
  );
  return response.data.data;
}

export async function deleteKnowledgeDocument(knowledgeBaseId: number, documentId: number) {
  await http.delete<ApiResponse<null>>(`/api/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`);
}

export async function reindexKnowledgeDocument(knowledgeBaseId: number, documentId: number) {
  const response = await http.post<ApiResponse<KnowledgeDocument>>(
    `/api/knowledge-bases/${knowledgeBaseId}/documents/${documentId}/reindex-search`
  );
  return response.data.data;
}
