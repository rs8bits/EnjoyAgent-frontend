export interface FileAsset {
  id: string;
  name: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
  kind: "INPUT" | "ARTIFACT";
  status: string;
  createdAt: string;
  taskId: string | null;
  stepKey: string | null;
}

export interface SandboxStatus {
  enabled: boolean;
  ready: boolean;
  maxFileBytes: number;
  defaultTimeoutSeconds: number;
}

export type SandboxOperation = "DEMO" | "PYTHON" | "SQL" | "PDF_EXTRACT" | "PDF_SPLIT" | "PDF_MERGE" | "PDF_RENDER" | "OFFICE_CONVERT" | "TABLE_INSPECT" | "TABLE_ANALYZE";
export interface SandboxTask {
  id: string;
  operation: SandboxOperation;
  status: string;
  stepKey: string;
  cancelRequested: boolean;
  createdAt: string;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SandboxRequest {
  operation: SandboxOperation;
  code?: string;
  fileIds: string[];
  timeoutSeconds: number;
  arguments?: Record<string, unknown>;
}

export interface SandboxTaskDetail {
  task: SandboxTask;
  executionId: string;
  timeoutSeconds: number;
  inputs: { fileId: string; inputName: string; originalName: string }[];
  artifacts: FileAsset[];
  execution: {
    exit_code: number | null;
    oom_killed: boolean;
    stdout: string;
    stderr: string;
    stdout_truncated: boolean;
    stderr_truncated: boolean;
    image_id: string | null;
    resource_usage: {
      wallTimeMs?: number;
      cpuTimeNanos?: number;
      sampledPeakMemoryBytes?: number;
      blockReadBytes?: number;
      blockWriteBytes?: number;
    };
  };
}

export interface FilePreview {
  kind: "text" | "binary" | "download" | "prepare";
  operation?: SandboxOperation;
  text?: string;
  truncated?: boolean;
}
