<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { Edge, Node } from "@vue-flow/core";
import type { ModelConfig } from "@/app/types/model";
import type { KnowledgeBase } from "@/app/types/knowledge";
import type { McpServer, McpTool } from "@/app/types/mcp";
import { buildMcpToolOptions, getMcpCatalogState, parseMcpToolInputSchema } from "@/app/utils/mcpTools";
import WorkflowVariablePicker from "@/app/components/workflow/WorkflowVariablePicker.vue";
import {
  buildWorkflowVariableGroups,
  getDirectUpstreamNodes,
  getWorkflowNodeOutputFields,
  insertTemplateVariable,
  validateWorkflowVariableReferences,
} from "@/app/utils/workflowVariables";

const props = defineProps<{
  selectedNode: Node | null;
  availableModelConfigs?: ModelConfig[];
  availableKnowledgeBases?: KnowledgeBase[];
  availableTools?: McpTool[];
  availableMcpServers?: McpServer[];
  canvasNodes?: Node[];
  canvasEdges?: Edge[];
}>();

const emit = defineEmits<{
  (e: "updateLabel", nodeId: string, label: string): void;
  (e: "updateConfig", nodeId: string, configJson: string): void;
  (e: "deleteNode", nodeId: string): void;
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
const fieldId = (name: string) => `workflow-${nodeId.value || "node"}-${name}`;
const nodeInputVariable = "{{node_input}}";
const userInputVariable = "{{user_input}}";
const systemPromptInput = ref<HTMLTextAreaElement | null>(null);
const knowledgeQueryInput = ref<HTMLTextAreaElement | null>(null);
const toolArgumentsInput = ref<HTMLTextAreaElement | null>(null);
const conditionExpressionInput = ref<HTMLInputElement | null>(null);
const conditionValueInput = ref<HTMLInputElement | null>(null);
const loopExitConditionInput = ref<HTMLInputElement | null>(null);
const loopExitValueInput = ref<HTMLInputElement | null>(null);
const endOutputTemplateInput = ref<HTMLTextAreaElement | null>(null);
const toolArgumentsDraft = ref("{}");
const toolArgumentsError = ref("");

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

const variableGroups = computed(() => props.selectedNode
  ? buildWorkflowVariableGroups(
      props.selectedNode.id,
      props.canvasNodes || [],
      props.canvasEdges || []
    )
  : []);

const directUpstreamNodes = computed(() => props.selectedNode
  ? getDirectUpstreamNodes(
      props.selectedNode.id,
      props.canvasNodes || [],
      props.canvasEdges || []
    )
  : []);

const outputFields = computed(() => getWorkflowNodeOutputFields(nodeType.value));

function outputReference(field: string) {
  return `{{${nodeId.value}.${field}}}`;
}

const referenceWarnings = computed(() => props.selectedNode
  ? validateWorkflowVariableReferences(
      JSON.stringify(configJson.value),
      props.selectedNode.id,
      props.canvasNodes || [],
      props.canvasEdges || []
    )
  : []);

const modelOptions = computed(() =>
  (props.availableModelConfigs || []).map(m => ({ label: `${m.name} · ${m.modelName}`, value: String(m.id) })));

const kbOptions = computed(() =>
  (props.availableKnowledgeBases || []).map(kb => ({ label: `${kb.name} (ID:${kb.id})`, value: String(kb.id) })));

const toolOptions = computed(() => buildMcpToolOptions(
  props.availableTools || [],
  props.availableMcpServers || []
));

const toolCatalogState = computed(() => getMcpCatalogState(
  props.availableTools || [],
  props.availableMcpServers || []
));

const toolCatalogHint = computed(() => {
  if (toolCatalogState.value === "NO_SERVER") {
    return "当前租户还没有 MCP Server。";
  }
  if (toolCatalogState.value === "EMPTY") {
    return `已配置 ${props.availableMcpServers?.length ?? 0} 个 MCP Server，但工具目录为空，请先同步远端工具。`;
  }
  if (toolCatalogState.value === "NO_ENABLED_TOOL") {
    return "已有工具均处于停用状态，请先启用对应 Server 和工具。";
  }
  return "这里只能选择当前租户中已启用 Server 下的已启用工具。";
});

const selectedTool = computed(() => (props.availableTools || [])
  .find((item) => item.id === Number(configJson.value.toolId)));

const selectedToolInputFields = computed(() =>
  parseMcpToolInputSchema(selectedTool.value?.inputSchemaJson));

function updateToolSelection(value: string) {
  const tool = (props.availableTools || []).find((item) => String(item.id) === value);
  if (!props.selectedNode) return;
  const current = {
    ...configJson.value,
    toolId: tool?.id ?? null,
    toolName: tool?.name ?? "",
  };
  if (tool && (!current.arguments || Object.keys(current.arguments as Record<string, unknown>).length === 0)) {
    current.arguments = Object.fromEntries(
      parseMcpToolInputSchema(tool.inputSchemaJson).map((field) => [field.name, ""])
    );
  }
  emit("updateConfig", props.selectedNode.id, JSON.stringify(current));
}


watch(
  () => [props.selectedNode?.id, props.selectedNode?.data?.configJson],
  () => {
    const argumentsValue = configJson.value.arguments;
    toolArgumentsDraft.value = argumentsValue && typeof argumentsValue === "object"
      ? JSON.stringify(argumentsValue, null, 2)
      : "{}";
    toolArgumentsError.value = "";
  },
  { immediate: true }
);

function updateToolArguments(raw: string) {
  toolArgumentsDraft.value = raw;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("参数必须是 JSON 对象");
    }
    toolArgumentsError.value = "";
    updateConfigField("arguments", parsed);
  } catch (error) {
    toolArgumentsError.value = error instanceof Error ? error.message : "参数 JSON 格式不正确";
  }
}

async function insertConfigVariable(
  key: string,
  variable: string,
  element: HTMLInputElement | HTMLTextAreaElement | null,
  useToolDraft = false
) {
  const source = useToolDraft
    ? toolArgumentsDraft.value
    : typeof configJson.value[key] === "string" ? configJson.value[key] as string : "";
  const inserted = insertTemplateVariable(
    source,
    variable,
    element?.selectionStart ?? source.length,
    element?.selectionEnd ?? element?.selectionStart ?? source.length
  );
  if (useToolDraft) {
    updateToolArguments(inserted.value);
  } else {
    updateConfigField(key, inserted.value);
  }
  await nextTick();
  element?.focus();
  element?.setSelectionRange(inserted.caret, inserted.caret);
}
</script>

<template>
  <div v-if="selectedNode" class="node-config-panel border-l border-line bg-white p-4">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-ink">节点属性</h3>
      <button type="button" aria-label="关闭节点属性" class="rounded-full p-1 text-muted hover:bg-accent-soft hover:text-accent" @click="emit('close')">
        <span class="text-lg leading-none">&times;</span>
      </button>
    </div>

    <div class="mb-3"><span class="text-xs text-muted">{{ nodeTypeLabel }}</span></div>

    <div class="mb-4 rounded-[14px] border border-line bg-canvas px-3 py-2">
      <div class="text-[11px] uppercase tracking-[0.16em] text-muted">稳定节点 Key</div>
      <div class="mt-1 break-all text-sm font-medium text-ink">{{ nodeId }}</div>
    </div>

    <div class="space-y-4">
      <div>
        <label :for="fieldId('name')" class="mb-1 block text-xs font-medium text-ink">名称</label>
        <input :id="fieldId('name')" v-model="nodeLabel" type="text"
          class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
          placeholder="节点名称" />
        <p class="mt-1 text-[11px] leading-4 text-muted">重命名只改变画布显示名；变量始终按稳定节点 Key 关联。</p>
      </div>

      <div class="rounded-[16px] border border-blue-100 bg-blue-50/60 p-3">
        <div class="text-xs font-semibold text-blue-900">节点输入</div>
        <div v-if="directUpstreamNodes.length" class="mt-2 space-y-1.5">
          <div v-for="input in directUpstreamNodes" :key="input.id" class="rounded-lg bg-white px-2.5 py-1.5 text-xs text-blue-900">
            <span class="font-medium">{{ input.nodeLabel }}</span>
            <code class="ml-1 break-all text-[10px] text-blue-600">[{{ input.nodeKey }}]</code>
          </div>
        </div>
        <p v-else class="mt-1 text-[11px] leading-4 text-blue-700">
          没有直接业务上游；需要原始输入时使用 <code>{{ userInputVariable }}</code>。
        </p>
        <p class="mt-2 text-[11px] leading-4 text-blue-700">
          变量选择器只列出沿连线可达的上游节点，避免引用下游或旁路节点。
        </p>
      </div>

      <div class="rounded-[16px] border border-emerald-100 bg-emerald-50/60 p-3">
        <div class="text-xs font-semibold text-emerald-900">节点输出（只读）</div>
        <div v-if="outputFields.length" class="mt-2 space-y-2">
          <div v-for="field in outputFields" :key="field.field" class="rounded-lg bg-white px-2.5 py-2">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="font-medium text-emerald-900">{{ field.label }}</span>
              <code class="break-all text-[10px] text-emerald-700">{{ field.field }}</code>
            </div>
            <div class="mt-1 text-[10px] leading-4 text-muted">{{ field.description }}</div>
            <code class="mt-1 block break-all text-[10px] text-emerald-700">{{ outputReference(field.field) }}</code>
          </div>
        </div>
        <p v-else class="mt-1 text-[11px] text-emerald-700">该节点没有可供下游引用的结构化输出字段。</p>
      </div>

      <div v-if="referenceWarnings.length" class="rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2" role="alert">
        <div class="text-xs font-semibold text-amber-800">变量引用需要处理</div>
        <ul class="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-4 text-amber-700">
          <li v-for="warning in referenceWarnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>

      <!-- LLM node -->
      <template v-if="nodeType === 'llm'">
        <div>
          <label :for="fieldId('model')" class="mb-1 block text-xs font-medium text-ink">模型配置</label>
          <select :id="fieldId('model')" :value="String(configJson.modelConfigId ?? '')"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            @change="updateConfigField('modelConfigId', Number(($event.target as HTMLSelectElement).value) || null)">
            <option value="">使用 Agent 默认模型</option>
            <option v-for="o in modelOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label :for="fieldId('system-prompt')" class="mb-1 block text-xs font-medium text-ink">System Prompt</label>
          <textarea :id="fieldId('system-prompt')" ref="systemPromptInput" :value="configJson.systemPrompt ?? ''" rows="3"
            class="w-full rounded-[14px] border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="例：请根据 {{node_input}} 生成摘要"
            @input="updateConfigField('systemPrompt', ($event.target as HTMLTextAreaElement).value)" />
          <WorkflowVariablePicker
            :groups="variableGroups"
            @insert="insertConfigVariable('systemPrompt', $event, systemPromptInput)"
          />
          <div class="mt-2 rounded-xl border border-line bg-canvas px-3 py-2 text-xs leading-5 text-muted">
            <div><code class="font-semibold text-ink">{{ nodeInputVariable }}</code>：直接上游节点的输出；没有业务上游时可改用原始输入变量。</div>
            <div><code class="font-semibold text-ink">{{ userInputVariable }}</code>：工作流开始时的原始用户输入。</div>
            <div class="mt-1">结构化引用使用 <code v-pre>{{nodeKey.field}}</code>；选择器展示节点名，但只持久化稳定 Key。</div>
          </div>
        </div>
        <div>
          <label :for="fieldId('temperature')" class="mb-1 block text-xs font-medium text-ink">Temperature</label>
          <input :id="fieldId('temperature')" :value="configJson.temperature ?? ''" type="number" step="0.1" min="0" max="2"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="默认" @input="updateConfigField('temperature', parseFloat(($event.target as HTMLInputElement).value) || null)" />
        </div>
      </template>

      <!-- Knowledge node -->
      <template v-if="nodeType === 'knowledge'">
        <div>
          <label :for="fieldId('knowledge-base')" class="mb-1 block text-xs font-medium text-ink">知识库</label>
          <select :id="fieldId('knowledge-base')" :value="String(configJson.knowledgeBaseId ?? '')"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            @change="updateConfigField('knowledgeBaseId', Number(($event.target as HTMLSelectElement).value) || null)">
            <option value="">请选择知识库</option>
            <option v-for="o in kbOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label :for="fieldId('query-template')" class="mb-1 block text-xs font-medium text-ink">检索问题模板</label>
          <textarea
            :id="fieldId('query-template')"
            ref="knowledgeQueryInput"
            :value="configJson.queryTemplate ?? ''"
            rows="3"
            class="w-full rounded-[14px] border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            placeholder="留空时兼容使用原始用户输入"
            @input="updateConfigField('queryTemplate', ($event.target as HTMLTextAreaElement).value)"
          />
          <WorkflowVariablePicker
            :groups="variableGroups"
            @insert="insertConfigVariable('queryTemplate', $event, knowledgeQueryInput)"
          />
        </div>
      </template>

      <!-- Tool node -->
      <template v-if="nodeType === 'tool'">
        <div>
          <label :for="fieldId('tool')" class="mb-1 block text-xs font-medium text-ink">MCP 工具</label>
          <select :id="fieldId('tool')" :value="String(configJson.toolId ?? '')"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            @change="updateToolSelection(($event.target as HTMLSelectElement).value)">
            <option value="">请选择工具</option>
            <option v-for="o in toolOptions" :key="o.value" :value="o.value" :disabled="o.disabled">{{ o.label }}</option>
          </select>
          <p class="mt-2 text-xs leading-5 text-muted">{{ toolCatalogHint }}</p>
          <RouterLink class="mt-1 inline-flex text-xs font-medium text-accent hover:underline" to="/app/mcp">
            前往 MCP 工具页同步或启用工具
          </RouterLink>
        </div>
        <div v-if="selectedToolInputFields.length" class="rounded-[14px] border border-line bg-canvas p-3">
          <div class="text-xs font-semibold text-ink">工具参数 Schema</div>
          <div v-for="field in selectedToolInputFields" :key="field.name" class="mt-2 rounded-lg bg-white px-2.5 py-2 text-xs">
            <div class="flex items-center gap-1.5">
              <code class="font-semibold text-ink">{{ field.name }}</code>
              <span class="text-muted">{{ field.type }}</span>
              <span v-if="field.required" class="text-rose-500">必填</span>
            </div>
            <div v-if="field.description" class="mt-1 text-[11px] leading-4 text-muted">{{ field.description }}</div>
          </div>
        </div>
        <div>
          <label :for="fieldId('tool-arguments')" class="mb-1 block text-xs font-medium text-ink">调用参数 JSON</label>
          <textarea
            :id="fieldId('tool-arguments')"
            ref="toolArgumentsInput"
            :value="toolArgumentsDraft"
            rows="7"
            spellcheck="false"
            class="w-full rounded-[14px] border bg-white px-3 py-2 font-mono text-xs text-ink focus:outline-none"
            :class="toolArgumentsError ? 'border-rose-300' : 'border-line focus:border-accent'"
            @input="updateToolArguments(($event.target as HTMLTextAreaElement).value)"
          />
          <p v-if="toolArgumentsError" class="mt-1 text-xs text-rose-600" role="alert">{{ toolArgumentsError }}</p>
          <p v-else class="mt-1 text-[11px] leading-4 text-muted">固定值直接填写；插入变量时请把光标放在 JSON 字符串值的引号内。</p>
          <WorkflowVariablePicker
            :groups="variableGroups"
            @insert="insertConfigVariable('arguments', $event, toolArgumentsInput, true)"
          />
        </div>
      </template>

      <!-- Condition node -->
      <template v-if="nodeType === 'condition'">
        <div>
          <label :for="fieldId('expression')" class="mb-1 block text-xs font-medium text-ink">表达式模板</label>
          <input :id="fieldId('expression')" ref="conditionExpressionInput" :value="configJson.expression" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="例：{{draft.llm_output}}" @input="updateConfigField('expression', ($event.target as HTMLInputElement).value)" />
          <WorkflowVariablePicker
            :groups="variableGroups"
            @insert="insertConfigVariable('expression', $event, conditionExpressionInput)"
          />
        </div>
        <div>
          <label :for="fieldId('operator')" class="mb-1 block text-xs font-medium text-ink">操作符</label>
          <select :id="fieldId('operator')" :value="configJson.operator"
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
          <label :for="fieldId('compare-value')" class="mb-1 block text-xs font-medium text-ink">比较值</label>
          <input :id="fieldId('compare-value')" ref="conditionValueInput" :value="configJson.value" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="要比较的值" @input="updateConfigField('value', ($event.target as HTMLInputElement).value)" />
          <WorkflowVariablePicker
            :groups="variableGroups"
            @insert="insertConfigVariable('value', $event, conditionValueInput)"
          />
        </div>
      </template>

      <!-- Loop node -->
      <template v-if="nodeType === 'loop'">
        <div>
          <label :for="fieldId('body-node-keys')" class="mb-1 block text-xs font-medium text-ink">Body 节点 Key（逗号分隔）</label>
          <input :id="fieldId('body-node-keys')" :value="configJson.bodyNodeKeys ? configJson.bodyNodeKeys.join(',') : ''" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="例: fetch_data,summarize" @input="updateConfigField('bodyNodeKeys', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))" />
        </div>
        <div>
          <label :for="fieldId('max-iterations')" class="mb-1 block text-xs font-medium text-ink">最大迭代次数</label>
          <input :id="fieldId('max-iterations')" :value="configJson.maxIterations ?? 3" type="number"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            @input="updateConfigField('maxIterations', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div>
          <label :for="fieldId('exit-condition')" class="mb-1 block text-xs font-medium text-ink">退出条件（可选）</label>
          <input :id="fieldId('exit-condition')" ref="loopExitConditionInput" :value="configJson.exitCondition ?? ''" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
            placeholder="例：{{draft.llm_output}}" @input="updateConfigField('exitCondition', ($event.target as HTMLInputElement).value)" />
          <WorkflowVariablePicker
            :groups="variableGroups"
            @insert="insertConfigVariable('exitCondition', $event, loopExitConditionInput)"
          />
        </div>
        <div>
          <label :for="fieldId('exit-operator')" class="mb-1 block text-xs font-medium text-ink">退出操作符</label>
          <select :id="fieldId('exit-operator')" :value="configJson.exitOperator ?? ''"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            @change="updateConfigField('exitOperator', ($event.target as HTMLSelectElement).value || null)">
            <option value="">按内联表达式判断</option>
            <option value="contains">包含 (contains)</option>
            <option value="equals">等于 (equals)</option>
            <option value="not_contains">不包含 (not_contains)</option>
            <option value="not_equals">不等于 (not_equals)</option>
            <option value="not_empty">非空 (not_empty)</option>
            <option value="empty">为空 (empty)</option>
          </select>
        </div>
        <div>
          <label :for="fieldId('exit-value')" class="mb-1 block text-xs font-medium text-ink">退出比较值（可选）</label>
          <input :id="fieldId('exit-value')" ref="loopExitValueInput" :value="configJson.exitValue ?? ''" type="text"
            class="w-full rounded-[18px] border border-line bg-white px-4 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            placeholder="要比较的值" @input="updateConfigField('exitValue', ($event.target as HTMLInputElement).value)" />
          <WorkflowVariablePicker
            :groups="variableGroups"
            @insert="insertConfigVariable('exitValue', $event, loopExitValueInput)"
          />
        </div>
      </template>

      <!-- End node -->
      <div v-if="nodeType === 'end'">
        <label :for="fieldId('output-template')" class="mb-1 block text-xs font-medium text-ink">最终输出模板</label>
        <textarea
          :id="fieldId('output-template')"
          ref="endOutputTemplateInput"
          :value="configJson.outputTemplate ?? ''"
          rows="4"
          class="w-full rounded-[14px] border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          placeholder="留空时兼容使用最近的模型输出"
          @input="updateConfigField('outputTemplate', ($event.target as HTMLTextAreaElement).value)"
        />
        <WorkflowVariablePicker
          :groups="variableGroups"
          @insert="insertConfigVariable('outputTemplate', $event, endOutputTemplateInput)"
        />
      </div>

      <button
        type="button"
        class="w-full rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
        @click="emit('deleteNode', selectedNode.id)"
      >
        从画布删除此节点
      </button>
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
