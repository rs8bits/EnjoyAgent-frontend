import { http } from "@/app/services/http";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
import type { FileAsset, FilePreview, SandboxRequest, SandboxStatus, SandboxTask, SandboxTaskDetail } from "@/app/types/files";

export async function listFiles(page = 0, signal?: AbortSignal) {
  return (await http.get<ApiResponse<PagedResponse<FileAsset>>>("/api/files", { params: { page, size: 20 }, signal })).data.data;
}
export async function getFileAsset(id: string) {
  return (await http.get<ApiResponse<FileAsset>>(`/api/files/${encodeURIComponent(id)}`)).data.data;
}
export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return (await http.post<ApiResponse<FileAsset>>("/api/files", form, { timeout: 300_000 })).data.data;
}
export async function previewFile(id: string) {
  return (await http.get<ApiResponse<FilePreview>>(`/api/files/${encodeURIComponent(id)}/preview`)).data.data;
}
export async function fileBlob(id: string) {
  return (await http.get<Blob>(`/api/files/${encodeURIComponent(id)}/download`, { responseType: "blob", timeout: 300_000 })).data;
}
export async function downloadFileAsset(file: FileAsset) {
  const blob = await fileBlob(file.id);
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = file.name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function sandboxStatus() {
  return (await http.get<ApiResponse<SandboxStatus>>("/api/sandbox/status")).data.data;
}
export async function listSandboxTasks(page = 0, signal?: AbortSignal) {
  return (await http.get<ApiResponse<PagedResponse<SandboxTask>>>("/api/sandbox/tasks", { params: { page, size: 20 }, signal })).data.data;
}
export async function createSandboxTask(request: SandboxRequest, idempotencyKey: string) {
  return (await http.post<ApiResponse<SandboxTask>>("/api/sandbox/tasks", request, { headers: { "Idempotency-Key": idempotencyKey } })).data.data;
}
export async function getSandboxTask(id: string, signal?: AbortSignal) {
  return (await http.get<ApiResponse<SandboxTaskDetail>>(`/api/sandbox/tasks/${encodeURIComponent(id)}`, { signal })).data.data;
}
export async function cancelSandboxTask(id: string) {
  return (await http.post<ApiResponse<SandboxTask>>(`/api/sandbox/tasks/${encodeURIComponent(id)}/cancel`)).data.data;
}
