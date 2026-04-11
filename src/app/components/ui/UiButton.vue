<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
    :class="variantClass"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    variant?: "primary" | "secondary" | "ghost";
    disabled?: boolean;
  }>(),
  {
    type: "button",
    variant: "primary",
    disabled: false
  }
);

const variantClass = computed(() => {
  if (props.variant === "secondary") {
    return "border-line bg-white text-ink shadow-sm hover:border-accent hover:text-accent";
  }

  if (props.variant === "ghost") {
    return "border-transparent bg-transparent text-muted hover:bg-accent-soft hover:text-accent";
  }

  return "border-accent bg-accent text-white shadow-card hover:brightness-105";
});
</script>
