export type CredentialProvider =
  | "OPENAI"
  | "ANTHROPIC"
  | "DASHSCOPE"
  | "DEEPSEEK"
  | "OPENROUTER"
  | "CUSTOM";

export type CredentialStatus = "ACTIVE" | "DISABLED" | string;

export interface Credential {
  id: number;
  name: string;
  provider: CredentialProvider | string;
  credentialType: string;
  secretMasked: string;
  baseUrl: string | null;
  description: string | null;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialPayload {
  name: string;
  provider: CredentialProvider;
  secret: string;
  baseUrl?: string;
  description?: string;
}

export interface UpdateCredentialPayload {
  name: string;
  secret?: string;
  baseUrl?: string;
  description?: string;
  status?: CredentialStatus;
}
