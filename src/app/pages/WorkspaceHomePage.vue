<template>
  <div class="min-h-full p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">工作台</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">
          欢迎回来，{{ authStore.currentUser?.displayName ?? "创作者" }}
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          阶段 1 和阶段 2 先把登录态、应用壳和核心入口做成可用工作台。后面每个模块会继续在这套结构里填进去。
        </p>
      </div>
      <div class="rounded-full border border-line bg-white px-4 py-2.5 text-sm text-muted shadow-sm">
        {{ authStore.currentUser?.tenantName }}
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
      <SectionCard
        eyebrow="阶段 5"
        title="前端已进入真实资源配置与 RAG 阶段"
        description="认证、应用壳、资源配置页、聊天工作台和知识库模块都已经接上，接下来就可以从前端真正配置 RAG Agent。"
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
            <p>当前的下一步重点会转到阶段六：把 MCP、工具绑定和 Agent 工具调用轨迹接起来。</p>
            <p>知识库模块已经进入真实联调阶段，后续会继续补更细的文档处理状态和检索调试体验。</p>
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SectionCard from "@/app/components/SectionCard.vue";
import { useAuthStore } from "@/app/stores/auth";

const authStore = useAuthStore();

const entries = [
  {
    title: "知识库管理",
    description: "创建知识库、上传文档，并把它绑定到 Agent，走通真实 RAG 管理主链。",
    to: "/app/knowledge"
  },
  {
    title: "凭证与模型配置",
    description: "阶段三已经接入真实接口，可以直接创建凭证和模型配置。",
    to: "/app/model-configs"
  },
  {
    title: "Agent 管理",
    description: "已经支持从前端创建和编辑 Agent，后面会继续接真实聊天能力。",
    to: "/app/agents"
  }
];
</script>
