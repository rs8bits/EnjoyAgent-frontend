<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { WorkflowVariableGroup } from "@/app/utils/workflowVariables";

const props = withDefaults(defineProps<{
  groups: WorkflowVariableGroup[];
  label?: string;
}>(), {
  label: "插入上游变量",
});

const emit = defineEmits<{
  (event: "insert", variable: string): void;
}>();

const selectedVariable = ref("");
const options = computed(() => props.groups.flatMap((group) => group.options));
const selectedOption = computed(() =>
  options.value.find((option) => option.value === selectedVariable.value));

watch(options, (currentOptions) => {
  if (selectedVariable.value && !currentOptions.some((option) => option.value === selectedVariable.value)) {
    selectedVariable.value = "";
  }
});

function insertSelectedVariable() {
  if (!selectedVariable.value) return;
  emit("insert", selectedVariable.value);
}
</script>

<template>
  <div class="mt-2 rounded-xl border border-line bg-canvas p-2.5">
    <label class="mb-1 block text-[11px] font-semibold text-ink">{{ label }}</label>
    <div class="flex gap-2">
      <select
        v-model="selectedVariable"
        class="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
        aria-label="选择工作流变量"
      >
        <option value="">请选择变量</option>
        <optgroup v-for="group in groups" :key="group.label" :label="group.label">
          <option v-for="option in group.options" :key="option.value" :value="option.value">
            {{ option.label }} · {{ option.value }}
          </option>
        </optgroup>
      </select>
      <button
        type="button"
        class="shrink-0 rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        :disabled="!selectedVariable"
        @click="insertSelectedVariable"
      >
        插入
      </button>
    </div>
    <p v-if="selectedOption" class="mt-1 break-all text-[11px] leading-4 text-muted">
      {{ selectedOption.description }}；保存引用：<code class="text-ink">{{ selectedOption.value }}</code>
    </p>
  </div>
</template>
