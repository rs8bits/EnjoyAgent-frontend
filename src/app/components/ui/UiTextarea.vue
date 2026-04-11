<template>
  <label class="block">
    <span class="mb-2 block text-sm font-medium text-ink">{{ label }}</span>
    <textarea
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      class="w-full rounded-[18px] border border-line bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/10"
      @input="onInput"
    />
    <span v-if="hint" class="mt-2 block text-xs text-muted">{{ hint }}</span>
    <span v-if="error" class="mt-2 block text-xs font-medium text-rose-500">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    placeholder?: string;
    rows?: number;
    hint?: string;
    error?: string;
  }>(),
  {
    placeholder: "",
    rows: 5,
    hint: undefined,
    error: undefined
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
}
</script>
