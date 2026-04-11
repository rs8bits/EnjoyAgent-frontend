<template>
  <header class="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-xl">
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

      <nav class="hidden items-center gap-2 md:flex">
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
        <div class="hidden rounded-full border border-line bg-white px-4 py-2 text-sm text-muted md:flex">
          {{ authStore.currentUser?.systemRole === "ADMIN" ? "管理员视角已启用" : "工作台模式" }}
        </div>
        <div class="hidden rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink lg:flex">
          {{ authStore.currentUser?.displayName }}
        </div>
        <button
          class="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent"
          @click="logout"
        >
          退出登录
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/app/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const topItems = computed(() => {
  const items = [
    { label: "首页", to: "/app/home" },
    { label: "知识库", to: "/app/knowledge" },
    { label: "工作台", to: "/app/chat/workspace" }
  ];

  if (authStore.isAdmin) {
    items.push({ label: "管理后台", to: "/app/admin/overview" });
  }

  return items;
});

function isActive(target: string) {
  return route.path.startsWith(target);
}

async function logout() {
  authStore.clearAuth();
  await router.replace("/login");
}
</script>
