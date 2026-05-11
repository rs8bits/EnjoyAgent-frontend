import { extractPagedResponseData, http } from "@/app/services/http";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
import type {
  CreateWorkflowPayload,
  SaveCanvasPayload,
  UpdateWorkflowPayload,
  Workflow,
  WorkflowCanvas,
} from "@/app/types/workflow";

export async function listWorkflows(page = 0, size = 20) {
  const response = await http.get<ApiResponse<PagedResponse<Workflow>>>("/api/workflows", {
    params: { page, size },
  });
  return extractPagedResponseData(response);
}

export async function createWorkflow(payload: CreateWorkflowPayload) {
  const response = await http.post<ApiResponse<Workflow>>("/api/workflows", payload);
  return response.data.data;
}

export async function getWorkflow(id: number) {
  const response = await http.get<ApiResponse<Workflow>>(`/api/workflows/${id}`);
  return response.data.data;
}

export async function updateWorkflow(id: number, payload: UpdateWorkflowPayload) {
  const response = await http.put<ApiResponse<Workflow>>(`/api/workflows/${id}`, payload);
  return response.data.data;
}

export async function deleteWorkflow(id: number) {
  await http.delete<ApiResponse<null>>(`/api/workflows/${id}`);
}

export async function getCanvas(workflowId: number) {
  const response = await http.get<ApiResponse<WorkflowCanvas>>(
    `/api/workflows/${workflowId}/canvas`
  );
  return response.data.data;
}

export async function saveCanvas(workflowId: number, payload: SaveCanvasPayload) {
  const response = await http.put<ApiResponse<WorkflowCanvas>>(
    `/api/workflows/${workflowId}/canvas`,
    payload
  );
  return response.data.data;
}
