import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { fetchCurrentUser, login as loginRequest, register as registerRequest } from "@/app/services/auth";
import { extractApiErrorMessage, setHttpAccessToken } from "@/app/services/http";
import type { AuthResponse, CurrentUser, LoginPayload, RegisterPayload } from "@/app/types/auth";

const ACCESS_TOKEN_KEY = "enjoyagent.access-token";

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function writeStoredToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(null);
  const currentUser = ref<CurrentUser | null>(null);
  const initialized = ref(false);
  const bootstrapping = ref(false);
  const hydrated = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value));
  const isAdmin = computed(() => currentUser.value?.systemRole === "ADMIN");

  function hydrate() {
    if (hydrated.value) {
      return;
    }
    hydrated.value = true;
    accessToken.value = readStoredToken();
    setHttpAccessToken(accessToken.value);
  }

  function applyAuth(auth: AuthResponse) {
    accessToken.value = auth.accessToken;
    currentUser.value = auth.currentUser;
    writeStoredToken(auth.accessToken);
    setHttpAccessToken(auth.accessToken);
    initialized.value = true;
  }

  function clearAuth() {
    accessToken.value = null;
    currentUser.value = null;
    writeStoredToken(null);
    setHttpAccessToken(null);
    initialized.value = true;
  }

  async function bootstrap() {
    hydrate();

    if (initialized.value || bootstrapping.value) {
      return;
    }

    if (!accessToken.value) {
      initialized.value = true;
      return;
    }

    bootstrapping.value = true;
    try {
      currentUser.value = await fetchCurrentUser();
    } catch {
      clearAuth();
    } finally {
      initialized.value = true;
      bootstrapping.value = false;
    }
  }

  async function login(payload: LoginPayload) {
    try {
      const auth = await loginRequest(payload);
      applyAuth(auth);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, message: extractApiErrorMessage(error, "Login failed") };
    }
  }

  async function register(payload: RegisterPayload) {
    try {
      const auth = await registerRequest(payload);
      applyAuth(auth);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, message: extractApiErrorMessage(error, "Registration failed") };
    }
  }

  async function refreshCurrentUser() {
    if (!accessToken.value) {
      currentUser.value = null;
      return;
    }
    currentUser.value = await fetchCurrentUser();
  }

  return {
    accessToken,
    currentUser,
    initialized,
    bootstrapping,
    isAuthenticated,
    isAdmin,
    hydrate,
    bootstrap,
    login,
    register,
    refreshCurrentUser,
    clearAuth
  };
});
