export interface CurrentUser {
  userId: number;
  email: string;
  displayName: string;
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  role: string;
  systemRole: "USER" | "ADMIN" | string;
}

export interface AuthResponse {
  accessToken?: string | null;
  tokenType: string;
  expiresAt: string;
  currentUser: CurrentUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  tenantName?: string;
}
