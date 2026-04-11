<template>
  <section
    class="rounded-[24px] border border-line bg-white p-6 shadow-card"
    :class="paddingClass"
  >
    <div v-if="eyebrow || title || description" class="mb-5">
      <div v-if="eyebrow" class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        {{ eyebrow }}
      </div>
      <div v-if="title" class="text-xl font-semibold tracking-tight text-ink">
        {{ title }}
      </div>
      <div v-if="description" class="mt-2 max-w-3xl text-sm leading-6 text-muted">
        {{ description }}
      </div>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    description?: string;
    roomy?: boolean;
  }>(),
  {
    eyebrow: undefined,
    title: undefined,
    description: undefined,
    roomy: false
  }
);

const paddingClass = computed(() => (props.roomy ? "p-8 lg:p-10" : "p-6"));
</script>
