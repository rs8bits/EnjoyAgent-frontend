<template>
  <label class="block">
    <span class="mb-2 block text-sm font-medium text-ink">{{ label }}</span>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      class="w-full rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/10"
      @input="onInput"
    />
    <span v-if="hint" class="mt-2 block text-xs text-muted">{{ hint }}</span>
    <span v-if="error" class="mt-2 block text-xs font-medium text-rose-500">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  modelValue: string;
  placeholder?: string;
  type?: string;
  hint?: string;
  error?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>
