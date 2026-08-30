<template>
  <div class="flex min-h-screen items-center justify-center bg-grid-fade px-5">
    <div class="w-full max-w-[520px] rounded-[30px] border border-white/70 bg-panel p-6 text-center shadow-shell backdrop-blur lg:p-8">
      <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">404</div>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-ink">页面不存在</h1>
      <p class="mt-3 text-sm leading-6 text-muted">
        请检查访问地址，或返回工作台。
      </p>
      <div class="mt-8 flex justify-center gap-3">
        <RouterLink class="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-card" to="/app/home">
          回到应用
        </RouterLink>
        <RouterLink class="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm" to="/login">
          去登录
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
