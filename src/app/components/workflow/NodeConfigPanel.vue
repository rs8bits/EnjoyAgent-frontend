<script setup lang="ts">
import { computed } from "vue";
import type { Node } from "@vue-flow/core";
import type { ModelConfig } from "@/app/types/model";
import type { KnowledgeBase } from "@/app/types/knowledge";
import type { McpTool } from "@/app/types/mcp";

const props = defineProps<{
  selectedNode: Node | null;
  availableModelConfigs?: ModelConfig[];
  availableKnowledgeBases?: KnowledgeBase[];
  availableTools?: McpTool[];
}>();

const emit = defineEmits<{
  (e: "updateLabel", nodeId: string, label: string): void;
  (e: "updateConfig", nodeId: string, configJson: string): void;
  (e: "close"): void;
}>();

const nodeLabel = computed({
  get: () => (props.selectedNode?.data?.label as string) || "",
  set: (val: string) => {
    if (props.selectedNode) emit("updateLabel", props.selectedNode.id, val);
  },
});

const configJson = computed(() => {
  const raw = props.selectedNode?.data?.configJson;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw || {};
});

const nodeType = computed(() => props.selectedNode?.type);
const nodeId = computed(() => props.selectedNode?.id ?? "");

const nodeTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    start: "开始节点", llm: "LLM 节点", knowledge: "知识检索节点",
    tool: "工具调用节点", condition: "条件判断节点", loop: "循环节点", end: "结束节点",
  };
  return labels[nodeType.value || ""] || nodeType.value;
});

function updateConfigField(key: string, value: unknown) {
  if (!props.selectedNode) return;
  const current = { ...configJson.value, [key]: value };
  emit("updateConfig", props.selectedNode.id, JSON.stringify(current));
}

const modelOptions = computed(() =>
  (props.availableModelConfigs || []).map(m => ({ label: `${m.name} · ${m.modelName}`, value: String(m.id) })));

const kbOptions = computed(() =>
  (props.availableKnowledgeBases || []).map(kb => ({ label: `${kb.name} (ID:${kb.id})`, value: String(kb.id) })));

const toolOptions = computed(() =>
  (props.availableTools || []).map(t => ({ label: `${t.name} (${t.serverName})`, value: String(t.id) })));

function updateToolSelection(value: string) {
  const tool = (props.availableTools || []).find((item) => String(item.id) === value);
  if (!props.selectedNode) return;
  const current = {
    ...configJson.value,
    toolId: tool?.id ?? null,
    toolName: tool?.name ?? "",
  };
  emit("updateConfig", props.selectedNode.id, JSON.stringify(current));
}
</script>

<template>
  <div v-if="selectedNode" class="node-config-panel border-l border-line bg-white p-4">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-ink">节点属性</h3>
      <button class="rounded-full p-1 text-muted hover:bg-accent-soft hover:text-accent" @click="emit('close')">
        <span class="text-lg leading-none">&times;</span>
      </button>
    </div>

    <div class="mb-3"><span class="text-xs text-muted">{{ nodeTypeLabel }}</span></div>

    <div class="mb-4 rounded-[14px] border border-line bg-canvas px-3 py-2">
      <div class="text-[11px] uppercase tracking-[0.16em] text-muted">节点 ID</div>
      <div class="mt-1 break-all text-sm font-medium text-ink">{{ nodeId }}</div>
    </div>

    <div class="space-y-4">
      <div>
        <label class="mb-1 block text-xs font-medium text-ink">名称</label>
        <input v-model="nodeLabel" type="text"
          class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
          placeholder="节点名称" />
      </div>

      <!-- LLM node -->
      <template v-if="nodeType === 'llm'">
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">模型配置</label>
          <select :value="String(configJson.modelConfigId ?? '')"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            @change="updateConfigField('modelConfigId', Number(($event.target as HTMLSelectElement).value) || null)">
            <option value="">使用 Agent 默认模型</option>
            <option v-for="o in modelOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">System Prompt</label>
          <textarea :value="configJson.systemPrompt ?? ''" rows="3"
            class="w-full rounded-[14px] border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="覆盖默认 system prompt（可选）"
            @input="updateConfigField('systemPrompt', ($event.target as HTMLTextAreaElement).value)" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">Temperature</label>
          <input :value="configJson.temperature ?? ''" type="number" step="0.1" min="0" max="2"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="默认" @input="updateConfigField('temperature', parseFloat(($event.target as HTMLInputElement).value) || null)" />
        </div>
      </template>

      <!-- Knowledge node -->
      <div v-if="nodeType === 'knowledge'">
        <label class="mb-1 block text-xs font-medium text-ink">知识库</label>
        <select :value="String(configJson.knowledgeBaseId ?? '')"
          class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
          @change="updateConfigField('knowledgeBaseId', Number(($event.target as HTMLSelectElement).value) || null)">
          <option value="">请选择知识库</option>
          <option v-for="o in kbOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <!-- Tool node -->
      <div v-if="nodeType === 'tool'">
        <label class="mb-1 block text-xs font-medium text-ink">MCP 工具</label>
        <select :value="String(configJson.toolId ?? '')"
          class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
          @change="updateToolSelection(($event.target as HTMLSelectElement).value)">
          <option value="">请选择工具</option>
          <option v-for="o in toolOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <!-- Condition node -->
      <template v-if="nodeType === 'condition'">
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">表达式模板</label>
          <input :value="configJson.expression" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder='例: {{llm_output}} contains "是"' @input="updateConfigField('expression', ($event.target as HTMLInputElement).value)" />
          <p class="mt-1 text-xs text-muted">使用 {'{{'}变量名{'}}'} 引用上下文中的值</p>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">操作符</label>
          <select :value="configJson.operator"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            @change="updateConfigField('operator', ($event.target as HTMLSelectElement).value)">
            <option value="contains">包含 (contains)</option>
            <option value="equals">等于 (equals)</option>
            <option value="not_contains">不包含 (not_contains)</option>
            <option value="not_equals">不等于 (not_equals)</option>
            <option value="not_empty">非空 (not_empty)</option>
            <option value="empty">为空 (empty)</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">比较值</label>
          <input :value="configJson.value" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="要比较的值" @input="updateConfigField('value', ($event.target as HTMLInputElement).value)" />
        </div>
      </template>

      <!-- Loop node -->
      <template v-if="nodeType === 'loop'">
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">Body 节点 ID（逗号分隔）</label>
          <input :value="configJson.bodyNodeIds ? configJson.bodyNodeIds.join(',') : ''" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="例: 10,11,12" @input="updateConfigField('bodyNodeIds', ($event.target as HTMLInputElement).value.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)))" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">最大迭代次数</label>
          <input :value="configJson.maxIterations ?? 3" type="number"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            @input="updateConfigField('maxIterations', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink">退出条件（可选）</label>
          <input :value="configJson.exitCondition ?? ''" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder='例: {{llm_output}} 不含工具调用' @input="updateConfigField('exitCondition', ($event.target as HTMLInputElement).value)" />
        </div>
      </template>
    </div>
  </div>
  <div v-else class="flex h-full items-center justify-center p-4 text-sm text-muted">
    选择一个节点查看属性
  </div>
</template>

<style scoped>
.node-config-panel { width: 260px; min-width: 260px; }
select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m2 4 4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
</style>
