<template>
  <div class="min-h-screen bg-grid-fade">
    <AppTopbar />
    <div class="mx-auto flex h-[calc(100vh-72px)] max-w-[1600px] gap-6 px-4 pb-6 pt-4 lg:px-6">
      <AppSidebar class="hidden lg:block" />
      <main class="min-h-0 min-w-0 flex-1">
        <div
          class="h-full rounded-shell border border-white/70 bg-panel shadow-shell backdrop-blur-xl"
        >
          <div class="ea-scroll h-full overflow-y-auto">
            <RouterView />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from "@/app/components/AppSidebar.vue";
import AppTopbar from "@/app/components/AppTopbar.vue";
</script>
