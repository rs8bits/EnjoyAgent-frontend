<template>
  <aside class="h-full w-[250px] shrink-0">
    <div class="ea-scroll h-full overflow-y-auto rounded-[26px] border border-white/70 bg-panel p-4 shadow-shell backdrop-blur-xl">
      <div class="mb-4 rounded-2xl border border-line bg-white p-4">
        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">当前工作区</div>
        <div class="mt-2 text-sm font-semibold text-ink">{{ authStore.currentUser?.tenantName }}</div>
        <div class="mt-1 text-xs text-muted">
          {{ authStore.currentUser?.displayName }} · {{ authStore.currentUser?.email }}
        </div>
      </div>

      <div class="space-y-6">
        <section v-for="section in sections" :key="section.title">
          <div class="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {{ section.title }}
          </div>
          <div class="space-y-1">
            <RouterLink
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition"
              :class="isActive(item.to) ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-white hover:text-ink'"
            >
              <span class="font-medium">{{ item.label }}</span>
              <component :is="item.icon" class="h-4 w-4" />
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Bot, Boxes, CreditCard, Database, KeyRound, LayoutDashboard, ShieldCheck, Sparkles, ToyBrick, Waypoints } from "lucide-vue-next";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/app/stores/auth";

const route = useRoute();
const authStore = useAuthStore();

const sections = computed(() => {
  const base = [
    {
      title: "开始使用",
      items: [
        { label: "工作台首页", to: "/app/home", icon: Sparkles },
        { label: "Agent 管理", to: "/app/agents", icon: Bot },
        { label: "知识库管理", to: "/app/knowledge", icon: Database }
      ]
    },
    {
      title: "资源配置",
      items: [
        { label: "凭证管理", to: "/app/credentials", icon: KeyRound },
        { label: "模型配置", to: "/app/model-configs", icon: ToyBrick },
        { label: "官方模型", to: "/app/official-models", icon: Waypoints }
      ]
    },
    {
      title: "体验预览",
      items: [
        { label: "聊天工作台", to: "/app/chat/workspace", icon: CreditCard },
        { label: "市场预览", to: "/app/home", icon: Boxes }
      ]
    }
  ];

  if (authStore.isAdmin) {
    base.push({
      title: "管理后台",
      items: [
        { label: "运营概览", to: "/app/admin/overview", icon: LayoutDashboard },
        { label: "审核中心", to: "/app/admin/overview", icon: ShieldCheck }
      ]
    });
  }

  return base;
});

function isActive(target: string) {
  return route.path.startsWith(target);
}
</script>
