<template>
  <header class="sticky top-0 z-30 border-b border-white/60 bg-white/95 backdrop-blur-xl" @keydown.esc="closeMobileMenu(true)">
    <div class="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white shadow-card">
          EA
        </div>
        <div class="min-w-0">
          <div class="text-lg font-semibold tracking-tight text-ink">EnjoyAgent</div>
          <div class="flex items-center gap-2 text-xs text-muted">
            <span>{{ authStore.currentUser?.tenantName ?? "工作区" }}</span>
            <span class="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
              {{ authStore.currentUser?.role === "OWNER" ? "拥有者" : "成员" }}
            </span>
          </div>
        </div>
      </div>

      <nav class="hidden items-center gap-2 md:flex" aria-label="主要导航">
        <RouterLink
          v-for="item in topItems"
          :key="item.to"
          :to="item.to"
          class="rounded-full px-4 py-2 text-sm font-medium transition"
          :class="isActive(item.to) ? 'bg-accent text-white shadow-card' : 'text-muted hover:bg-white hover:text-ink'"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="flex items-center gap-3">
        <div class="hidden rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink lg:flex">
          {{ authStore.currentUser?.displayName }}
        </div>
        <button
          type="button"
          class="hidden rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent sm:inline-flex"
          :disabled="loggingOut"
          @click="logout"
        >
          {{ loggingOut ? "正在退出…" : "退出登录" }}
        </button>
        <button
          ref="mobileMenuButton"
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink lg:hidden"
          :aria-label="mobileMenuOpen ? '关闭完整导航' : '打开完整导航'"
          aria-controls="mobile-workspace-navigation"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <X v-if="mobileMenuOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>
      </div>
    </div>

    <nav
      v-if="mobileMenuOpen"
      ref="mobileMenu"
      id="mobile-workspace-navigation"
      class="absolute inset-x-0 top-full max-h-[calc(100vh-72px)] overflow-y-auto border-b border-line bg-white p-4 shadow-shell lg:hidden"
      aria-label="完整工作区导航"
      @keydown.esc="mobileMenuOpen = false"
    >
      <div class="mx-auto grid max-w-[960px] gap-2 sm:grid-cols-2">
        <RouterLink
          v-for="item in mobileItems"
          :key="item.to"
          :to="item.to"
          class="rounded-2xl border border-line px-4 py-3 text-sm font-medium transition"
          :class="isActive(item.to) ? 'bg-accent text-white' : 'bg-canvas text-ink hover:border-accent'"
          @click="closeMobileMenu(false)"
        >
          {{ item.label }}
        </RouterLink>
        <button
          type="button"
          class="rounded-2xl border border-line bg-canvas px-4 py-3 text-left text-sm font-medium text-ink sm:hidden"
          :disabled="loggingOut"
          @click="logout"
        >
          {{ loggingOut ? "正在退出…" : "退出登录" }}
        </button>
      </div>
    </nav>
    <p v-if="logoutError" class="border-t border-danger/20 bg-danger/10 px-4 py-2 text-center text-sm text-danger" role="alert">
      {{ logoutError }}
    </p>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Menu, X } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/app/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const mobileMenuOpen = ref(false);
const mobileMenuButton = ref<HTMLButtonElement | null>(null);
const mobileMenu = ref<HTMLElement | null>(null);
const loggingOut = ref(false);
const logoutError = ref("");

const topItems = computed(() => {
  const items = [
    { label: "首页", to: "/app/home" },
    { label: "AI 客服", to: "/app/support" },
    { label: "工作台", to: "/app/chat/workspace" }
  ];

  if (authStore.isOwner) {
    items.splice(1, 0, { label: "知识库", to: "/app/knowledge" });
  }

  if (authStore.isAdmin) {
    items.push({ label: "管理后台", to: "/app/admin/overview" });
  }

  return items;
});

const mobileItems = computed(() => {
  const items = [
    { label: "工作台首页", to: "/app/home" },
    { label: "凭证管理", to: "/app/credentials" },
    { label: "官方模型", to: "/app/official-models" },
    { label: "AI 客服", to: "/app/support" },
    { label: "聊天工作台", to: "/app/chat/workspace" },
    { label: "钱包中心", to: "/app/wallet" },
    { label: "共享市场", to: "/app/market" }
  ];
  if (authStore.isOwner) {
    items.splice(1, 0,
      { label: "Agent 管理", to: "/app/agents" },
      { label: "知识库管理", to: "/app/knowledge" },
      { label: "MCP 工具", to: "/app/mcp" },
      { label: "工作流", to: "/app/workflows" },
      { label: "模型配置", to: "/app/model-configs" }
    );
  }
  if (authStore.isAdmin) {
    items.push(
      { label: "运营概览", to: "/app/admin/overview" },
      { label: "官方模型管理", to: "/app/admin/official-models" },
      { label: "审核中心", to: "/app/admin/reviews" }
    );
  }
  return items;
});

watch(() => route.fullPath, () => {
  closeMobileMenu(false);
});

watch(mobileMenuOpen, async (open) => {
  if (!open) {
    return;
  }
  await nextTick();
  mobileMenu.value?.querySelector<HTMLElement>("a, button")?.focus();
});

function closeMobileMenu(returnFocus: boolean) {
  if (!mobileMenuOpen.value) {
    return;
  }
  mobileMenuOpen.value = false;
  if (returnFocus) {
    void nextTick(() => mobileMenuButton.value?.focus());
  }
}

function isActive(target: string) {
  return route.path.startsWith(target);
}

async function logout() {
  if (loggingOut.value) {
    return;
  }
  loggingOut.value = true;
  logoutError.value = "";
  const result = await authStore.logout();
  loggingOut.value = false;
  if (!result.ok) {
    logoutError.value = result.message;
    return;
  }
  await router.replace("/login");
}
</script>
