<template>
  <label class="block">
    <span class="mb-2 block text-sm font-medium text-ink">{{ label }}</span>
    <select
      :id="inputId"
      :value="modelValue"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="describedBy"
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
    <span v-if="hint" :id="`${inputId}-hint`" class="mt-2 block text-xs text-muted">{{ hint }}</span>
    <span v-if="error" :id="`${inputId}-error`" class="mt-2 block text-xs font-medium text-rose-500">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";

const props = defineProps<{
  label: string;
  modelValue: string;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}>();

const inputId = useId();
const describedBy = computed(() => [
  props.hint ? `${inputId}-hint` : "",
  props.error ? `${inputId}-error` : ""
].filter(Boolean).join(" ") || undefined);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
}
</script>
