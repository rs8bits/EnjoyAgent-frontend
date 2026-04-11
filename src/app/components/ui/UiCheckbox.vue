<template>
  <label class="flex items-start gap-3 rounded-[18px] border border-line bg-white px-4 py-3">
    <input
      :checked="modelValue"
      type="checkbox"
      class="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent/20"
      @change="onChange"
    />
    <span class="min-w-0">
      <span class="block text-sm font-medium text-ink">{{ label }}</span>
      <span v-if="hint" class="mt-1 block text-xs leading-5 text-muted">{{ hint }}</span>
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  modelValue: boolean;
  hint?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).checked);
}
</script>
