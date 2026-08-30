<template>
  <div class="ea-scroll h-full overflow-y-auto p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">工作台</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">
          欢迎回来，{{ authStore.currentUser?.displayName ?? "创作者" }}
        </h1>
      </div>
      <div class="rounded-full border border-line bg-white px-4 py-2.5 text-sm text-muted shadow-sm">
        {{ authStore.currentUser?.tenantName }}
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
      <SectionCard
        eyebrow="快捷入口"
        title="常用功能"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <RouterLink
            v-for="entry in entries"
            :key="entry.to"
            :to="entry.to"
            class="rounded-[22px] border border-line bg-canvas p-5 transition hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white"
          >
            <div class="text-base font-semibold text-ink">{{ entry.title }}</div>
          </RouterLink>
        </div>
      </SectionCard>

      <div class="space-y-5">
        <SectionCard eyebrow="当前身份" title="已登录上下文">
          <div class="space-y-3 text-sm">
            <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
              <span class="text-muted">邮箱</span>
              <span class="font-medium text-ink">{{ authStore.currentUser?.email }}</span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
              <span class="text-muted">租户角色</span>
              <span class="font-medium text-ink">{{ authStore.currentUser?.role === "OWNER" ? "拥有者" : "成员" }}</span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
              <span class="text-muted">系统角色</span>
              <span class="font-medium text-ink">{{ authStore.currentUser?.systemRole === "ADMIN" ? "管理员" : "普通用户" }}</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import { useAuthStore } from "@/app/stores/auth";

const authStore = useAuthStore();

const entries = computed(() => {
  const items = [
    {
      title: "聊天工作台",
      to: "/app/chat/workspace"
    },
    {
      title: "钱包中心",
      to: "/app/wallet"
    },
    {
      title: "共享市场",
      to: "/app/market"
    },
    {
      title: "凭证管理",
      to: "/app/credentials"
    },
    {
      title: "官方模型",
      to: "/app/official-models"
    }
  ];

  if (authStore.isOwner) {
    items.splice(1, 0,
      {
        title: "Agent 管理",
        to: "/app/agents"
      },
      {
        title: "知识库管理",
        to: "/app/knowledge"
      },
      {
        title: "MCP 工具",
        to: "/app/mcp"
      },
      {
        title: "模型配置",
        to: "/app/model-configs"
      }
    );
  }

  if (authStore.isAdmin) {
    items.splice(4, 0, {
      title: "管理后台",
      to: "/app/admin/overview"
    });
  }

  return items;
});
</script>
