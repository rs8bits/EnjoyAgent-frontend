<script setup lang="ts">
import { markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, Database, FlaskConical, GitBranch, Loader2, Play, Repeat, Save, Sparkles, StopCircle, Wrench } from "lucide-vue-next";
import { VueFlow, MarkerType } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import type { Node, Edge, Connection, EdgeMouseEvent, GraphNode, VueFlowStore, XYPosition } from "@vue-flow/core";
import { getCanvas, getWorkflow, saveCanvas } from "@/app/services/workflow";
import type { Workflow, WorkflowNodeItem, WorkflowEdgeItem } from "@/app/types/workflow";
import StartNode from "@/app/components/workflow/nodes/StartNode.vue";
import LlmNode from "@/app/components/workflow/nodes/LlmNode.vue";
import KnowledgeNode from "@/app/components/workflow/nodes/KnowledgeNode.vue";
import ToolNode from "@/app/components/workflow/nodes/ToolNode.vue";
import ConditionNode from "@/app/components/workflow/nodes/ConditionNode.vue";
import LoopNode from "@/app/components/workflow/nodes/LoopNode.vue";
import EndNode from "@/app/components/workflow/nodes/EndNode.vue";
import NodeConfigPanel from "@/app/components/workflow/NodeConfigPanel.vue";
import { extractApiErrorMessage, getHttpAccessToken } from "@/app/services/http";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import { listModelConfigs } from "@/app/services/models";
import type { ModelConfig } from "@/app/types/model";
import { listKnowledgeBases } from "@/app/services/knowledge";
import type { KnowledgeBase } from "@/app/types/knowledge";
import { listMcpTools } from "@/app/services/mcp";
import type { McpTool } from "@/app/types/mcp";

const route = useRoute();
const router = useRouter();

const workflowId = Number(route.params.id);
const workflow = ref<Workflow | null>(null);
const saving = ref(false);
const saveMessage = ref("");
const loadingModels = ref(false);
const availableChatModels = ref<ModelConfig[]>([]);
const availableKnowledgeBases = ref<KnowledgeBase[]>([]);
const availableTools = ref<McpTool[]>([]);

const nodeTypes = {
  start: markRaw(StartNode),
  llm: markRaw(LlmNode),
  knowledge: markRaw(KnowledgeNode),
  tool: markRaw(ToolNode),
  condition: markRaw(ConditionNode),
  loop: markRaw(LoopNode),
  end: markRaw(EndNode),
};

const defaultEdgeStyle = { stroke: "#94a3b8", strokeWidth: 2 };
const defaultEdgeMarker = { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#94a3b8" };
const defaultEdgeOptions = {
  animated: true,
  style: defaultEdgeStyle,
  markerEnd: defaultEdgeMarker,
};

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
const draggedType = ref<string | null>(null);
const canvasContainer = ref<HTMLElement | null>(null);
const flowInstance = ref<VueFlowStore | null>(null);

const selectedNodeId = ref<string | null>(null);
const selectedNode = ref<Node | null>(null);
const selectedEdgeId = ref<string | null>(null);

onMounted(async () => {
  await Promise.all([loadWorkflow(), loadCanvas(), loadAvailableChatModels(), loadAvailableKnowledgeBases(), loadAvailableTools()]);
  document.addEventListener("drop", onGlobalDragEnd);
  document.addEventListener("dragend", onGlobalDragEnd);
  document.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("drop", onGlobalDragEnd);
  document.removeEventListener("dragend", onGlobalDragEnd);
  document.removeEventListener("keydown", onKeyDown);
  document.body.style.userSelect = "";
});

async function loadWorkflow() {
  try {
    workflow.value = await getWorkflow(workflowId);
  } catch (error) {
    console.error("Failed to load workflow:", error);
  }
}

async function loadCanvas() {
  try {
    const canvas = await getCanvas(workflowId);
    nodes.value = canvas.nodes.map(toVueFlowNode);
    edges.value = canvas.edges.map(toVueFlowEdge);
  } catch {
    // New workflow with no canvas data yet
  }
}

function toVueFlowNode(n: WorkflowNodeItem): Node {
  return {
    id: String(n.id),
    type: n.nodeType.toLowerCase(),
    position: { x: n.positionX, y: n.positionY },
    draggable: true,
    selectable: true,
    connectable: true,
    data: {
      label: n.name,
      configJson: n.configJson,
    },
  };
}

function toVueFlowEdge(e: WorkflowEdgeItem): Edge {
  return {
    id: String(e.id),
    source: String(e.sourceNodeId),
    target: String(e.targetNodeId),
    sourceHandle: e.sourceHandle || undefined,
    targetHandle: e.targetHandle || undefined,
    animated: true,
    style: defaultEdgeStyle,
    markerEnd: defaultEdgeMarker,
  };
}

function onDragOver(event: DragEvent) {
  if (!draggedType.value) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  const type = draggedType.value || event.dataTransfer?.getData("application/vueflow");
  if (!type) return;

  const position = getDropPosition(event);

  const labels: Record<string, string> = {
    start: "开始",
    llm: "LLM",
    knowledge: "知识检索",
    tool: "工具调用",
    condition: "条件判断",
    loop: "循环",
    end: "结束",
  };

  const newNode: Node = {
    id: `node_${Date.now()}`,
    type,
    position,
    draggable: true,
    selectable: true,
    connectable: true,
    data: {
      label: labels[type] || type,
      configJson: "{}",
    },
  };

  nodes.value = [...nodes.value, newNode];
  selectedNodeId.value = newNode.id;
  selectedNode.value = newNode;
  onGlobalDragEnd();
}

function getDropPosition(event: DragEvent): XYPosition {
  const fallbackBaseX = 40 + (nodes.value.length % 3) * 220;
  const fallbackBaseY = 40 + Math.floor(nodes.value.length / 3) * 120;
  const rawPosition = toFlowPosition(event) ?? { x: fallbackBaseX, y: fallbackBaseY };

  return {
    x: Math.max(20, Math.round(rawPosition.x - 80)),
    y: Math.max(20, Math.round(rawPosition.y - 28)),
  };
}

function toFlowPosition(event: DragEvent): XYPosition | null {
  const instance = flowInstance.value;
  const flowRoot = instance?.vueFlowRef;

  if (instance && flowRoot) {
    const rect = flowRoot.getBoundingClientRect();
    const viewport = instance.getViewport();
    return {
      x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
      y: (event.clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }

  const rect = canvasContainer.value?.getBoundingClientRect();
  if (!rect) {
    return null;
  }

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function onPaneReady(instance: VueFlowStore) {
  flowInstance.value = instance;
}

function normalizeHandle(handle?: string | null) {
  return handle || null;
}

function isSameConnection(edge: Edge, connection: Connection) {
  return edge.source === connection.source
    && edge.target === connection.target
    && normalizeHandle(edge.sourceHandle) === normalizeHandle(connection.sourceHandle)
    && normalizeHandle(edge.targetHandle) === normalizeHandle(connection.targetHandle);
}

function getCurrentCanvasState() {
  const snapshot = flowInstance.value?.toObject();
  return {
    currentNodes: (snapshot?.nodes as Node[] | undefined) ?? nodes.value,
    currentEdges: (snapshot?.edges as Edge[] | undefined) ?? edges.value,
  };
}

function getCurrentEdges() {
  return getCurrentCanvasState().currentEdges;
}

function syncCanvasRefsFromStore() {
  const snapshot = flowInstance.value?.toObject();
  if (!snapshot) {
    return;
  }
  nodes.value = snapshot.nodes as Node[];
  edges.value = snapshot.edges as Edge[];
}

function canCreateConnection(connection: Connection, sourceNode?: GraphNode | Node, targetNode?: GraphNode | Node): boolean {
  if (!connection.source || !connection.target || connection.source === connection.target) return false;
  const { currentNodes, currentEdges } = getCurrentCanvasState();
  const source = sourceNode ?? currentNodes.find((node) => node.id === connection.source);
  const target = targetNode ?? currentNodes.find((node) => node.id === connection.target);
  if (!source || !target) return false;
  const existing = currentEdges.some((edge) => isSameConnection(edge, connection));
  if (existing) return false;
  if (target.type === "start") return false;
  if (source.type === "end") return false;
  return true;
}

function isValidConnection(connection: Connection, elements: { sourceNode: GraphNode; targetNode: GraphNode }): boolean {
  return canCreateConnection(connection, elements.sourceNode, elements.targetNode);
}

function toWorkflowEdge(connection: Connection): Edge {
  return {
    id: [
      "edge",
      connection.source,
      normalizeHandle(connection.sourceHandle) || "source",
      connection.target,
      normalizeHandle(connection.targetHandle) || "target",
    ].join("_"),
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle || undefined,
    targetHandle: connection.targetHandle || undefined,
    animated: true,
    style: defaultEdgeStyle,
    markerEnd: defaultEdgeMarker,
  };
}

function autoConnectEdge(connection: Connection): (Connection & Partial<Edge>) | false {
  if (!canCreateConnection(connection)) {
    return false;
  }
  return toWorkflowEdge(connection);
}

function onConnect(connection: Connection) {
  const edge = toWorkflowEdge(connection);
  nextTick(() => {
    const exists = getCurrentEdges().some((currentEdge) => isSameConnection(currentEdge, connection));
    if (!exists && flowInstance.value) {
      flowInstance.value.addEdges(edge);
    } else if (!exists) {
      edges.value = [...edges.value, edge];
    }
    syncCanvasRefsFromStore();
  });
  selectedEdgeId.value = null;
}

function onNodeClick({ node }: { node: Node }) {
  selectedNodeId.value = node.id;
  selectedNode.value = node;
  selectedEdgeId.value = null;
}

function onEdgeClick({ edge }: EdgeMouseEvent) {
  selectedEdgeId.value = edge.id;
  selectedNodeId.value = null;
  selectedNode.value = null;
}

function onPaneClick() {
  selectedNodeId.value = null;
  selectedNode.value = null;
  selectedEdgeId.value = null;
}

function onUpdateLabel(nodeId: string, label: string) {
  nodes.value = nodes.value.map((node) => node.id === nodeId
    ? { ...node, data: { ...node.data, label } }
    : node);
}

function onUpdateConfig(nodeId: string, configJson: string) {
  nodes.value = nodes.value.map((node) => node.id === nodeId
    ? { ...node, data: { ...node.data, configJson } }
    : node);
}

function onKeyDown(event: KeyboardEvent) {
  const target = event.target;
  if (target instanceof HTMLElement) {
    const tagName = target.tagName.toLowerCase();
    if (target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select") {
      return;
    }
  }

  if ((event.key === "Delete" || event.key === "Backspace") && selectedNodeId.value) {
    edges.value = edges.value.filter(
      (e) => e.source !== selectedNodeId.value && e.target !== selectedNodeId.value
    );
    nodes.value = nodes.value.filter((node) => node.id !== selectedNodeId.value);
    selectedNodeId.value = null;
    selectedNode.value = null;
  }
  if ((event.key === "Delete" || event.key === "Backspace") && selectedEdgeId.value) {
    edges.value = edges.value.filter((edge) => edge.id !== selectedEdgeId.value);
    selectedEdgeId.value = null;
  }
}

watch([nodes, selectedNodeId], ([currentNodes, currentSelectedId]) => {
  selectedNode.value = currentSelectedId
    ? currentNodes.find((node) => node.id === currentSelectedId) || null
    : null;
}, { deep: true });

watch(
  () => [nodes.value, edges.value],
  () => {
    saveMessage.value = "";
  },
  { deep: true }
);

async function handleSave() {
  const { currentNodes, currentEdges } = getCurrentCanvasState();
  const startCount = currentNodes.filter((n) => n.type === "start").length;
  const endCount = currentNodes.filter((n) => n.type === "end").length;

  if (startCount !== 1) {
    saveMessage.value = "工作流必须且只能包含一个开始节点";
    return;
  }
  if (endCount !== 1) {
    saveMessage.value = "工作流必须且只能包含一个结束节点";
    return;
  }

  saving.value = true;
  saveMessage.value = "";

  const nodeIndexMap = new Map<string, number>();
  currentNodes.forEach((n, i) => nodeIndexMap.set(n.id, i));

  try {
    const savedCanvas = await saveCanvas(workflowId, {
      nodes: currentNodes.map((n) => ({
        name: (n.data?.label as string) || n.type || "",
        nodeType: (n.type || "LLM").toUpperCase(),
        configJson: (n.data?.configJson as string) || "{}",
        positionX: Math.round(n.position.x),
        positionY: Math.round(n.position.y),
      })),
      edges: currentEdges.map((e) => ({
        sourceNodeIndex: nodeIndexMap.get(e.source) ?? 0,
        targetNodeIndex: nodeIndexMap.get(e.target) ?? 0,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
      })),
    });
    nodes.value = savedCanvas.nodes.map(toVueFlowNode);
    edges.value = savedCanvas.edges.map(toVueFlowEdge);
    selectedNodeId.value = null;
    selectedNode.value = null;
    saveMessage.value = "画布已保存";
  } catch (error) {
    saveMessage.value = extractApiErrorMessage(error, "保存失败");
  } finally {
    saving.value = false;
  }
}

function goBack() {
  router.push("/app/workflows");
}

const paletteNodes = [
  { type: "start", label: "开始", icon: Play, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { type: "llm", label: "LLM", icon: Sparkles, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { type: "knowledge", label: "知识检索", icon: Database, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { type: "tool", label: "工具调用", icon: Wrench, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { type: "condition", label: "条件判断", icon: GitBranch, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { type: "loop", label: "循环", icon: Repeat, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  { type: "end", label: "结束", icon: StopCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
];

function onDragStart(event: DragEvent, nodeType: string) {
  draggedType.value = nodeType;
  document.body.style.userSelect = "none";
  event.dataTransfer?.setData("application/vueflow", nodeType);
  event.dataTransfer!.effectAllowed = "move";
}

function onGlobalDragEnd() {
  draggedType.value = null;
  document.body.style.userSelect = "";
}

async function loadAvailableChatModels() {
  loadingModels.value = true;
  try {
    const result = await listModelConfigs(0, 100);
    availableChatModels.value = result.items.filter(
      (model) => model.enabled && model.modelType === "CHAT"
    );
    if (!testModelConfigId.value && availableChatModels.value.length > 0) {
      testModelConfigId.value = availableChatModels.value[0].id;
    }
  } catch {
    availableChatModels.value = [];
  } finally {
    loadingModels.value = false;
  }
}

async function loadAvailableKnowledgeBases() {
  try {
    const result = await listKnowledgeBases(0, 100);
    availableKnowledgeBases.value = result.items.filter((kb) => kb.enabled);
  } catch {
    availableKnowledgeBases.value = [];
  }
}

async function loadAvailableTools() {
  try {
    const result = await listMcpTools(undefined, 0, 200);
    availableTools.value = result.items.filter((t) => t.enabled);
  } catch {
    availableTools.value = [];
  }
}

// -- Test run state --
const showTestPanel = ref(false);
const testInput = ref("");
const testModelConfigId = ref<number | null>(null);
const testRunning = ref(false);
const testEvents = ref<{ type: string; nodeName: string; output?: Record<string, unknown>; data?: Record<string, unknown>; finalOutput?: string }[]>([]);
const testFinalOutput = ref("");
const testError = ref("");
const execHistory = ref<{ id: number; triggerType: string; status: string; inputJson: string; outputJson: string; nodeCount: number; durationMs: number; errorMessage: string; createdAt: string }[]>([]);
const selectedTestModelConfigId = ref("");

watch(availableChatModels, (models) => {
  if (!selectedTestModelConfigId.value && models.length > 0) {
    selectedTestModelConfigId.value = String(models[0].id);
  }
});

watch(selectedTestModelConfigId, (value) => {
  testModelConfigId.value = value ? Number(value) : null;
});

async function loadHistory() {
  try {
    const token = getHttpAccessToken();
    if (!token) {
      execHistory.value = [];
      return;
    }
    const res = await fetch(`/api/workflows/${workflowId}/executions?page=0&size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("加载执行历史失败");
    }
    const data = await res.json();
    execHistory.value = data.data?.items || [];
  } catch { /* ignore */ }
}

async function runTest() {
  if (!testInput.value.trim() || !testModelConfigId.value) return;
  testRunning.value = true;
  testEvents.value = [];
  testFinalOutput.value = "";
  testError.value = "";

  const token = getHttpAccessToken();
  if (!token) {
    testError.value = "未找到登录凭证，请重新登录后再试。";
    testRunning.value = false;
    return;
  }

  try {
    const draftCanvas = buildCanvasPayload();
    const response = await fetch(`/api/workflows/${workflowId}/test-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        userInput: testInput.value,
        modelConfigId: testModelConfigId.value,
        canvas: draftCanvas,
      }),
    });
    if (!response.ok) {
      let message = "测试运行失败";
      try {
        const errorBody = await response.json();
        message = errorBody?.data?.message || errorBody?.message || message;
      } catch {
        // ignore json parse errors
      }
      throw new Error(message);
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("当前浏览器环境不支持测试流式响应。");
    }
    const decoder = new TextDecoder();
    let buffer = "";

    const dispatchEventBlock = (rawEvent: string) => {
      const lines = rawEvent.split("\n");
      let eventType = "message";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (!dataLines.length) {
        return;
      }

      try {
        const data = JSON.parse(dataLines.join("\n"));
        if (eventType === "completed") {
          testFinalOutput.value = data.finalOutput || "";
          return;
        }
        if (eventType === "error") {
          testError.value = data.message || "测试运行失败";
          return;
        }
        testEvents.value.push({
          type: eventType,
          nodeName: data.nodeName || "",
          output: data.data,
          data,
        });
      } catch {
        // ignore parse errors from incomplete events
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        dispatchEventBlock(event);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      dispatchEventBlock(buffer);
    }
  } catch (e) {
    testError.value = (e as Error).message || "测试运行失败";
  } finally {
    testRunning.value = false;
    loadHistory();
  }
}

function buildCanvasPayload() {
  const { currentNodes, currentEdges } = getCurrentCanvasState();
  const nodeIndexMap = new Map<string, number>();
  currentNodes.forEach((node, index) => nodeIndexMap.set(node.id, index));

  return {
    nodes: currentNodes.map((node) => ({
      name: (node.data?.label as string) || node.type || "",
      nodeType: (node.type || "LLM").toUpperCase(),
      configJson: (node.data?.configJson as string) || "{}",
      positionX: Math.round(node.position.x),
      positionY: Math.round(node.position.y),
    })),
    edges: currentEdges.map((edge) => ({
      sourceNodeIndex: nodeIndexMap.get(edge.source) ?? 0,
      targetNodeIndex: nodeIndexMap.get(edge.target) ?? 0,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
    })),
  };
}

watch(showTestPanel, (v) => { if (v) loadHistory(); });
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Top toolbar -->
    <div class="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
      <div class="flex items-center gap-4">
        <button class="flex items-center gap-1 text-sm text-muted hover:text-ink" @click="goBack">
          <ArrowLeft class="h-4 w-4" />
          返回
        </button>
        <div class="h-5 w-px bg-line"></div>
        <h2 class="text-sm font-semibold text-ink">
          {{ workflow?.name || "工作流画布" }}
        </h2>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="saveMessage" class="text-xs" :class="saveMessage === '画布已保存' ? 'text-emerald-600' : 'text-rose-500'">
          {{ saveMessage }}
        </span>
        <button
          class="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:brightness-105 disabled:opacity-50"
          :disabled="saving"
          @click="handleSave"
        >
          <Save class="h-4 w-4" />
          {{ saving ? "保存中..." : "保存" }}
        </button>
      </div>
    </div>

    <!-- Main area -->
    <div class="flex min-h-0 flex-1">
      <!-- Left palette -->
      <div class="flex shrink-0 flex-col gap-2 border-r border-line bg-white p-3" style="width: 160px">
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">节点面板</div>
        <div
          v-for="item in paletteNodes"
          :key="item.type"
          draggable="true"
          class="flex cursor-grab items-center gap-2 rounded-xl border px-3 py-2.5 text-sm active:cursor-grabbing"
          :class="[item.bg, item.border]"
          @dragstart="onDragStart($event, item.type)"
          @dragend="onGlobalDragEnd"
        >
          <component :is="item.icon" class="h-4 w-4" :class="item.color" />
          <span class="text-sm font-medium">{{ item.label }}</span>
        </div>
      </div>

      <!-- Canvas -->
      <div ref="canvasContainer" class="min-w-0 flex-1" @dragover="onDragOver" @drop="onDrop">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :default-edge-options="defaultEdgeOptions"
          :is-valid-connection="isValidConnection"
          :nodes-draggable="true"
          :nodes-connectable="true"
          :elements-selectable="true"
          :snap-to-grid="true"
          :snap-grid="[20, 20]"
          :connect-on-click="true"
          :connection-radius="36"
          :auto-connect="autoConnectEdge"
          :auto-pan-on-connect="true"
          :elevate-edges-on-select="true"
          fit-view-on-init
          @pane-ready="onPaneReady"
          @connect="onConnect"
          @node-click="onNodeClick"
          @edge-click="onEdgeClick"
          @pane-click="onPaneClick"
        >
          <Background variant="dots" :gap="20" :size="1" />
          <Controls position="bottom-right" />
        </VueFlow>
      </div>

      <!-- Right panel: config / test toggle -->
      <div class="flex shrink-0 flex-col border-l border-line bg-white" style="width:280px">
        <div class="flex border-b border-line">
          <button
            class="flex-1 py-2.5 text-xs font-semibold transition"
            :class="!showTestPanel ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'"
            @click="showTestPanel = false"
          >属性</button>
          <button
            class="flex-1 py-2.5 text-xs font-semibold transition"
            :class="showTestPanel ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'"
            @click="showTestPanel = true"
          >🧪 测试</button>
        </div>

        <NodeConfigPanel
          v-if="!showTestPanel"
          :selected-node="selectedNode"
          :available-model-configs="availableChatModels"
          :available-knowledge-bases="availableKnowledgeBases"
          :available-tools="availableTools"
          @update-label="onUpdateLabel"
          @update-config="onUpdateConfig"
          @close="onPaneClick"
        />

        <!-- Test panel -->
        <div v-if="showTestPanel" class="flex flex-1 flex-col overflow-y-auto p-4">
          <div class="mb-3 text-xs font-semibold text-ink">测试运行</div>

          <label class="mb-1 text-xs text-muted">输入消息</label>
          <textarea
            v-model="testInput"
            rows="3"
            class="mb-3 w-full rounded-[14px] border border-line px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/10 focus:outline-none"
            placeholder="输入测试消息..."
            :disabled="testRunning"
          ></textarea>

          <UiSelect
            v-model="selectedTestModelConfigId"
            label="测试模型"
            :options="availableChatModels.map((model) => ({ label: `${model.name} · ${model.modelName}`, value: String(model.id) }))"
            placeholder="请选择一个聊天模型"
            :hint="availableChatModels.length ? '这里只展示当前租户启用中的聊天模型。' : '当前没有可用于测试的聊天模型，请先去模型配置页创建。'"
            :disabled="testRunning || loadingModels || availableChatModels.length === 0"
          />

          <button
            class="mb-4 flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-105 disabled:opacity-50"
            :disabled="testRunning || !testInput.trim() || !testModelConfigId"
            @click="runTest"
          >
            <Loader2 v-if="testRunning" class="h-4 w-4 animate-spin" />
            <FlaskConical v-else class="h-4 w-4" />
            {{ testRunning ? "运行中..." : "运行测试" }}
          </button>

          <div v-if="testError" class="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-600">{{ testError }}</div>

          <div v-if="testEvents.length" class="text-xs font-semibold text-ink mb-2">执行日志</div>
          <div v-for="(evt, i) in testEvents" :key="i" class="mb-1.5 rounded-lg border px-3 py-1.5 text-xs">
            <div class="flex items-center gap-1.5">
              <span v-if="evt.type === 'node_started'" class="text-blue-500">▶</span>
              <span v-else-if="evt.type === 'node_completed'" class="text-emerald-500">✓</span>
              <span v-else-if="evt.type === 'node_skipped'" class="text-amber-500">⏭</span>
              <span v-else-if="evt.type === 'node_failed'" class="text-rose-500">✗</span>
              <span class="font-medium">{{ evt.nodeName }}</span>
              <span class="text-muted">({{ evt.type.replace("node_", "") }})</span>
            </div>
            <div v-if="evt.output && Object.keys(evt.output).length" class="mt-1 text-muted truncate">
              {{ JSON.stringify(evt.output).slice(0, 80) }}
            </div>
          </div>

          <div v-if="testFinalOutput" class="mt-3 rounded-lg bg-emerald-50 p-3">
            <div class="text-xs font-semibold text-emerald-700 mb-1">最终输出</div>
            <div class="text-sm text-emerald-900 whitespace-pre-wrap">{{ testFinalOutput }}</div>
          </div>

          <!-- Execution history -->
          <div v-if="execHistory.length" class="mt-4">
            <div class="mb-2 text-xs font-semibold text-ink">执行历史</div>
            <div v-for="h in execHistory" :key="h.id" class="mb-1.5 rounded-lg border px-2.5 py-1.5 text-xs">
              <div class="flex items-center gap-1.5">
                <span v-if="h.status === 'COMPLETED'" class="text-emerald-500">✓</span>
                <span v-else-if="h.status === 'FAILED'" class="text-rose-500">✗</span>
                <span v-else class="text-blue-500">◌</span>
                <span class="text-muted">{{ h.triggerType === 'TEST' ? '测试' : '聊天' }}</span>
                <span class="text-muted">{{ h.durationMs }}ms</span>
                <span class="text-muted ml-auto">{{ h.createdAt?.slice(0, 19).replace('T', ' ') }}</span>
              </div>
              <div v-if="h.errorMessage" class="mt-1 text-rose-500 truncate">{{ h.errorMessage }}</div>
            </div>
          </div>

          <div v-if="!testEvents.length && !testRunning && !testError && !execHistory.length" class="mt-8 text-center text-xs text-muted">
            输入测试消息并选择模型后运行
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.vue-flow__pane {
  cursor: default;
}

.vue-flow__handle {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  background: #64748b;
  box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.16);
  transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.vue-flow__handle:hover,
.vue-flow__handle.connecting,
.vue-flow__handle.valid {
  background: #2563eb;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.18);
  transform: scale(1.08);
}

.vue-flow__edge.selected path {
  stroke: #2563eb;
  stroke-width: 3;
}
</style>
