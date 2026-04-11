<template>
  <div class="min-h-full p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-3 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">管理后台</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">平台运营概览</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          这里先做成轻量运营后台预览，不走传统沉重的 Admin 模板，而是保持和用户工作台一致的设计体系。
        </p>
      </div>
      <button class="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent">
        导出快照
      </button>
    </div>

    <div class="grid gap-5 lg:grid-cols-4">
      <SectionCard
        v-for="stat in stats"
        :key="stat.label"
        :eyebrow="stat.label"
        :title="stat.value"
        :description="stat.description"
      />
    </div>

    <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <SectionCard eyebrow="队列" title="待处理审核">
        <div class="space-y-3">
          <div
            v-for="item in reviews"
            :key="item.title"
            class="rounded-[20px] border border-line bg-canvas px-4 py-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-sm font-semibold text-ink">{{ item.title }}</div>
                <div class="mt-1 text-sm text-muted">{{ item.subtitle }}</div>
              </div>
              <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-accent">{{ item.tag }}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="信号" title="平台健康度">
        <div class="space-y-4">
          <div
            v-for="signal in signals"
            :key="signal.label"
            class="rounded-[20px] border border-line bg-canvas px-4 py-4"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted">{{ signal.label }}</span>
              <span class="text-sm font-semibold text-ink">{{ signal.value }}</span>
            </div>
            <div class="mt-3 h-2 rounded-full bg-white">
              <div
                class="h-2 rounded-full bg-accent"
                :style="{ width: signal.progress }"
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import SectionCard from "@/app/components/SectionCard.vue";

const stats = [
  {
    label: "官方模型调用",
    value: "12.4k",
    description: "最近 7 天托管模型请求量"
  },
  {
    label: "待审充值单",
    value: "18",
    description: "待管理员审核的充值申请"
  },
  {
    label: "市场安装量",
    value: "1,284",
    description: "累计安装次数"
  },
  {
    label: "异步计费健康度",
    value: "99.2%",
    description: "最近 24 小时计费消费成功率"
  }
];

const reviews = [
  {
    title: "Agent 安装包：全球研究助手",
    subtitle: "包含打包知识库和 MCP 工具",
    tag: "Agent"
  },
  {
    title: "充值单 #R-20260410-18",
    subtitle: "等待财务核验并入账钱包",
    tag: "计费"
  },
  {
    title: "MCP 资产：网页抓取入门版",
    subtitle: "OAuth 要求需要人工复核",
    tag: "MCP"
  }
];

const signals = [
  {
    label: "RabbitMQ 消费负载",
    value: "健康",
    progress: "68%"
  },
  {
    label: "检索索引新鲜度",
    value: "延迟 4 分钟",
    progress: "82%"
  },
  {
    label: "市场安装成功率",
    value: "96.8%",
    progress: "97%"
  }
];
</script>
