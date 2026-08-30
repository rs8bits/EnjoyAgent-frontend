<template>
  <nav
    v-if="totalPages > 1"
    class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
    aria-label="分页导航"
  >
    <div class="text-sm text-muted">
      共 {{ total }} 条，第 {{ page + 1 }} / {{ totalPages }} 页
    </div>
    <div class="flex flex-wrap items-center gap-1 sm:justify-end sm:gap-2">
      <UiButton
        variant="ghost"
        :disabled="page <= 0"
        aria-label="转到第一页"
        @click="$emit('change', 0)"
      >
        首页
      </UiButton>
      <UiButton
        variant="ghost"
        :disabled="page <= 0"
        aria-label="转到上一页"
        @click="$emit('change', page - 1)"
      >
        上一页
      </UiButton>
      <div class="flex items-center gap-1">
        <button
          v-for="p in visiblePages"
          :key="p"
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition"
          :class="p === page
            ? 'bg-accent text-white shadow-sm'
            : 'text-muted hover:bg-accent-soft hover:text-accent'"
          :aria-label="`转到第 ${p + 1} 页`"
          :aria-current="p === page ? 'page' : undefined"
          @click="$emit('change', p)"
        >
          {{ p + 1 }}
        </button>
      </div>
      <UiButton
        variant="ghost"
        :disabled="page >= totalPages - 1"
        aria-label="转到下一页"
        @click="$emit('change', page + 1)"
      >
        下一页
      </UiButton>
      <UiButton
        variant="ghost"
        :disabled="page >= totalPages - 1"
        aria-label="转到最后一页"
        @click="$emit('change', totalPages - 1)"
      >
        末页
      </UiButton>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import UiButton from "./UiButton.vue";

const props = defineProps<{
  page: number;
  size: number;
  total: number;
  totalPages: number;
}>();

defineEmits<{
  change: [page: number];
}>();

const visiblePages = computed(() => {
  const maxVisible = 5;
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(0, props.page - half);
  const end = Math.min(props.totalPages, start + maxVisible);
  if (end - start < maxVisible) {
    start = Math.max(0, end - maxVisible);
  }
  return Array.from({ length: end - start }, (_, i) => start + i);
});
</script>
