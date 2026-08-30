import { computed, ref } from "vue";
import axios from "axios";
import { defineStore } from "pinia";
import {
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest
} from "@/app/services/auth";
import { extractApiErrorMessage } from "@/app/services/http";
import type { AuthResponse, CurrentUser, LoginPayload, RegisterPayload } from "@/app/types/auth";

export const useAuthStore = defineStore("auth", () => {
  const currentUser = ref<CurrentUser | null>(null);
  const initialized = ref(false);
  const bootstrapping = ref(false);
  const bootstrapError = ref("");
  let bootstrapPromise: Promise<void> | null = null;

  const isAuthenticated = computed(() => currentUser.value !== null);
  const isAdmin = computed(() => currentUser.value?.systemRole === "ADMIN");
  const isOwner = computed(() => currentUser.value?.role === "OWNER");

  function applyAuth(auth: AuthResponse) {
    currentUser.value = auth.currentUser;
    bootstrapError.value = "";
    initialized.value = true;
  }

  function clearAuth() {
    currentUser.value = null;
    initialized.value = true;
  }

  async function bootstrap(force = false) {
    if (initialized.value && !force) {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    bootstrapPromise = (async () => {
      bootstrapping.value = true;
      bootstrapError.value = "";
      try {
        currentUser.value = await fetchCurrentUser();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearAuth();
        } else {
          bootstrapError.value = extractApiErrorMessage(error, "暂时无法验证登录状态");
        }
      } finally {
        initialized.value = true;
        bootstrapping.value = false;
      }
    })();

    try {
      await bootstrapPromise;
    } finally {
      bootstrapPromise = null;
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
    currentUser.value = await fetchCurrentUser();
  }

  async function logout() {
    try {
      await logoutRequest();
      clearAuth();
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, message: extractApiErrorMessage(error, "退出登录失败") };
    }
  }

  return {
    currentUser,
    initialized,
    bootstrapping,
    bootstrapError,
    isAuthenticated,
    isAdmin,
    isOwner,
    bootstrap,
    login,
    register,
    logout,
    refreshCurrentUser,
    clearAuth
  };
});
