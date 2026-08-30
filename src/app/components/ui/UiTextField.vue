<template>
  <label class="block">
    <span class="mb-2 block text-sm font-medium text-ink">{{ label }}</span>
    <input
      :id="inputId"
      :value="modelValue"
      :type="type"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :aria-invalid="Boolean(error)"
      :aria-describedby="describedBy"
      class="w-full rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/10"
      @input="onInput"
    />
    <span v-if="hint" :id="`${inputId}-hint`" class="mt-2 block text-xs text-muted">{{ hint }}</span>
    <span v-if="error" :id="`${inputId}-error`" class="mt-2 block text-xs font-medium text-rose-500">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";

const props = defineProps<{
  label: string;
  modelValue: string;
  placeholder?: string;
  type?: string;
  autocomplete?: string;
  hint?: string;
  error?: string;
}>();

const inputId = useId();
const describedBy = computed(() => [
  props.hint ? `${inputId}-hint` : "",
  props.error ? `${inputId}-error` : ""
].filter(Boolean).join(" ") || undefined);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>
