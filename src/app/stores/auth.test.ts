import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mocks = vi.hoisted(() => ({
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn()
}));

vi.mock("@/app/services/auth", () => mocks);
vi.mock("@/app/services/http", () => ({
  extractApiErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback
}));

import { useAuthStore } from "@/app/stores/auth";

const currentUser = {
  userId: 7,
  email: "owner@example.com",
  displayName: "Owner",
  tenantId: 3,
  tenantCode: "team",
  tenantName: "Team",
  role: "OWNER",
  systemRole: "USER"
};

describe("HttpOnly cookie authentication store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it("restores the user through /me without needing a JavaScript token", async () => {
    mocks.fetchCurrentUser.mockResolvedValue(currentUser);
    const store = useAuthStore();

    await store.bootstrap();

    expect(store.currentUser).toEqual(currentUser);
    expect(store.isAuthenticated).toBe(true);
    expect(store.isOwner).toBe(true);
  });

  it("treats only a 401 bootstrap response as an anonymous session", async () => {
    mocks.fetchCurrentUser.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 }
    });
    const store = useAuthStore();

    await store.bootstrap();

    expect(store.currentUser).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.bootstrapError).toBe("");
  });

  it("surfaces a bootstrap outage instead of misclassifying it as a 401", async () => {
    mocks.fetchCurrentUser.mockRejectedValue(new Error("backend unavailable"));
    const store = useAuthStore();

    await store.bootstrap();

    expect(store.currentUser).toBeNull();
    expect(store.bootstrapError).toBe("backend unavailable");
  });

  it("keeps the local user visible when logout fails and clears it after success", async () => {
    mocks.login.mockResolvedValue({
      accessToken: null,
      tokenType: "Bearer",
      expiresAt: "2026-08-09T12:00:00Z",
      currentUser
    });
    mocks.logout.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce(undefined);
    const store = useAuthStore();
    await store.login({ email: currentUser.email, password: "password" });

    await expect(store.logout()).resolves.toEqual({ ok: false, message: "network down" });
    expect(store.currentUser).toEqual(currentUser);

    await expect(store.logout()).resolves.toEqual({ ok: true });
    expect(store.currentUser).toBeNull();
  });
});
