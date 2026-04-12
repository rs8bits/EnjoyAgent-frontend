<template>
  <div class="h-screen overflow-hidden bg-grid-fade">
    <AppTopbar />
    <div class="mx-auto flex h-[calc(100vh-72px)] max-w-[1600px] gap-6 px-4 pb-6 pt-4 lg:px-6">
      <AppSidebar class="hidden lg:block" />
      <main class="min-h-0 min-w-0 flex flex-1 flex-col">
        <div
          class="h-full min-h-0 rounded-shell border border-white/70 bg-panel shadow-shell backdrop-blur-xl"
        >
          <div class="ea-scroll h-full min-h-0 overflow-x-hidden overflow-y-auto">
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
