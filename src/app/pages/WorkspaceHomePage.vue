<template>
  <div class="ea-scroll h-full overflow-y-auto p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">工作台</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">
          欢迎回来，{{ authStore.currentUser?.displayName ?? "创作者" }}
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          认证、Agent、知识库、聊天工作台、MCP、钱包、共享市场和管理后台都已经接到真实后端。现在前端已经具备用户侧和管理员侧的完整闭环。
        </p>
      </div>
      <div class="rounded-full border border-line bg-white px-4 py-2.5 text-sm text-muted shadow-sm">
        {{ authStore.currentUser?.tenantName }}
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
      <SectionCard
        eyebrow="阶段 8"
        title="前端已经进入真实产品闭环阶段"
        description="认证、应用壳、资源配置页、聊天工作台、知识库模块、MCP、钱包、共享市场和管理后台都已经接入，接下来重点会转向工程化和体验收尾。"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <RouterLink
            v-for="entry in entries"
            :key="entry.to"
            :to="entry.to"
            class="rounded-[22px] border border-line bg-canvas p-5 transition hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white"
          >
            <div class="text-base font-semibold text-ink">{{ entry.title }}</div>
            <div class="mt-2 text-sm leading-6 text-muted">{{ entry.description }}</div>
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

        <SectionCard eyebrow="下一步" title="后续阶段方向">
          <div class="space-y-3 text-sm leading-6 text-muted">
            <p>阶段八已经把管理员审核与运营后台补齐，下一步会转到阶段九：做统一体验、分页筛选、测试和文档收口。</p>
            <p>现在用户侧和管理侧的主链都已经基本闭环，接下来重点会是把这套前端磨成更稳定的成品。</p>
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
      title: "知识库管理",
      description: "创建知识库、上传文档，并把它绑定到 Agent，走通真实 RAG 管理主链。",
      to: "/app/knowledge"
    },
    {
      title: "MCP 工具",
      description: "配置 MCP Server、同步工具目录，并把工具真正绑定到 Agent。",
      to: "/app/mcp"
    },
    {
      title: "钱包中心",
      description: "查看余额、流水，并创建待审核的充值单。",
      to: "/app/wallet"
    },
    {
      title: "共享市场",
      description: "浏览已上架资产，提交自己的 Agent、知识库或 MCP Server。",
      to: "/app/market"
    },
    {
      title: "凭证与模型配置",
      description: "阶段三已经接入真实接口，可以直接创建凭证和模型配置。",
      to: "/app/model-configs"
    },
    {
      title: "Agent 管理",
      description: "已经支持从前端创建和编辑 Agent，并与知识库、MCP 配置协同工作。",
      to: "/app/agents"
    }
  ];

  if (authStore.isAdmin) {
    items.splice(4, 0, {
      title: "管理后台",
      description: "管理员可以在这里管理官方模型、审核充值单和审核市场资产。",
      to: "/app/admin/overview"
    });
  }

  return items;
});
</script>
