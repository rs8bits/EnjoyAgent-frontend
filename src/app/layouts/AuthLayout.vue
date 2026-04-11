<template>
  <div class="min-h-screen bg-grid-fade">
    <div class="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.05fr)]">
      <section class="relative hidden overflow-hidden border-r border-white/60 bg-[linear-gradient(180deg,#f9fbff_0%,#eef4ff_100%)] lg:flex">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(47,109,246,0.18),transparent_30%),radial-gradient(circle_at_85%_22%,rgba(102,154,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,248,255,0.92))]" />
        <div class="relative flex w-full flex-col justify-between p-12">
          <div>
            <div class="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/75 px-4 py-3 shadow-card backdrop-blur">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white">
                EA
              </div>
              <div>
                <div class="text-sm font-semibold text-ink">EnjoyAgent</div>
                <div class="text-xs text-muted">多租户 AI 工作台</div>
              </div>
            </div>

            <h1 class="mt-12 max-w-xl text-5xl font-semibold tracking-tight text-ink">
              用统一工作台把 Agent、知识、工具和平台运营串起来。
            </h1>
            <p class="mt-6 max-w-xl text-base leading-8 text-muted">
              前端正式阶段从这里开始。先固定应用壳和认证体验，再把 Agent、知识库、MCP、计费和市场能力逐步接入。
            </p>
          </div>

          <div class="grid gap-4">
            <div
              v-for="feature in features"
              :key="feature.title"
              class="rounded-[26px] border border-white/70 bg-white/75 p-5 shadow-card backdrop-blur"
            >
              <div class="text-sm font-semibold text-ink">{{ feature.title }}</div>
              <div class="mt-2 text-sm leading-6 text-muted">{{ feature.description }}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="flex min-h-screen items-center justify-center px-5 py-10 lg:px-10">
        <RouterView />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const features = [
  {
    title: "统一运行时",
    description: "把 Agent、RAG、MCP 和官方模型放到同一套工作台体验里。"
  },
  {
    title: "异步计费",
    description: "钱包、充值审核、官方模型 token 计费都可以在同一产品语境中呈现。"
  },
  {
    title: "可安装市场",
    description: "市场不只是分享对象，而是审核后可安装的 Agent 资产包。"
  }
];
</script>
