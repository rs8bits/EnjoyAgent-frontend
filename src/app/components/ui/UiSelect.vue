<template>
  <label class="block">
    <span class="mb-2 block text-sm font-medium text-ink">{{ label }}</span>
    <select
      :value="modelValue"
      :disabled="disabled"
      class="w-full rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted"
      @change="onChange"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <span v-if="hint" class="mt-2 block text-xs text-muted">{{ hint }}</span>
    <span v-if="error" class="mt-2 block text-xs font-medium text-rose-500">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  modelValue: string;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
}
</script>
