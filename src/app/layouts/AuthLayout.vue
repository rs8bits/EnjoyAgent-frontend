<template>
  <div class="min-h-screen bg-grid-fade">
    <div class="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.05fr)]">
      <section class="relative hidden overflow-hidden border-r border-white/60 bg-[linear-gradient(180deg,#f9fbff_0%,#eef4ff_100%)] lg:flex">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(47,109,246,0.18),transparent_30%),radial-gradient(circle_at_85%_22%,rgba(102,154,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,248,255,0.92))]" />
        <div class="relative flex w-full flex-col justify-center p-12">
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
              构建你的 AI Agent。
            </h1>
          </div>
        </div>
      </section>

      <section class="flex min-h-screen items-center justify-center px-5 py-10 lg:px-10">
        <RouterView />
      </section>
    </div>
  </div>
</template>
