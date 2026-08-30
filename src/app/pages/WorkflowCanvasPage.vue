<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, Database, FlaskConical, GitBranch, Loader2, Play, Repeat, Save, Sparkles, StopCircle, Trash2, Wrench } from "lucide-vue-next";
import { VueFlow, MarkerType } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import type { Node, Edge, Connection, EdgeMouseEvent, GraphNode, VueFlowStore, XYPosition } from "@vue-flow/core";
import { getCanvas, getWorkflow, saveCanvas } from "@/app/services/workflow";
import type { Workflow, WorkflowCanvas, WorkflowNodeItem, WorkflowEdgeItem } from "@/app/types/workflow";
import StartNode from "@/app/components/workflow/nodes/StartNode.vue";
import LlmNode from "@/app/components/workflow/nodes/LlmNode.vue";
import KnowledgeNode from "@/app/components/workflow/nodes/KnowledgeNode.vue";
import ToolNode from "@/app/components/workflow/nodes/ToolNode.vue";
import ConditionNode from "@/app/components/workflow/nodes/ConditionNode.vue";
import LoopNode from "@/app/components/workflow/nodes/LoopNode.vue";
import EndNode from "@/app/components/workflow/nodes/EndNode.vue";
import NodeConfigPanel from "@/app/components/workflow/NodeConfigPanel.vue";
import { authenticatedFetch, extractApiErrorMessage, extractFetchErrorMessage, isRequestCanceled } from "@/app/services/http";
import { consumeSseStream } from "@/app/services/sse";
import { fetchAllPages } from "@/app/services/pagination";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import { listModelConfigs } from "@/app/services/models";
import type { ModelConfig } from "@/app/types/model";
import { listKnowledgeBases } from "@/app/services/knowledge";
import type { KnowledgeBase } from "@/app/types/knowledge";
import { listMcpServers, listMcpTools } from "@/app/services/mcp";
import type { McpServer, McpTool } from "@/app/types/mcp";
import type { ApiResponse, PagedResponse } from "@/app/types/api";
import {
  appendCanvasEdge,
  createCanvasHydrationCoordinator,
  createNewNodeConfigJson,
  createUniqueNodeKey,
  removeCanvasEdge,
  removeCanvasNode,
} from "@/app/utils/workflowCanvas";
import {
  findNodeVariableReferences,
  validateCanvasWorkflowVariableReferences,
} from "@/app/utils/workflowVariables";

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
const availableMcpServers = ref<McpServer[]>([]);
const resourceError = ref("");
const historyError = ref("");
let testRunController: AbortController | null = null;
let historyController: AbortController | null = null;
let resourceController: AbortController | null = null;

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
const nodeKeyPattern = /^[A-Za-z0-9_-]{1,64}$/;

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
const canvasHydration = createCanvasHydrationCoordinator<Node, Edge>();
const flowNodes = computed<Node[]>({
  get: () => nodes.value,
  set: (nextNodes) => {
    if (canvasHydration.shouldAcceptNodes(nextNodes)) {
      nodes.value = nextNodes;
    }
  },
});
const flowEdges = computed<Edge[]>({
  get: () => edges.value,
  set: (nextEdges) => {
    if (canvasHydration.shouldAcceptEdges(nextEdges)) {
      edges.value = nextEdges;
    }
  },
});
const draggedType = ref<string | null>(null);
const canvasContainer = ref<HTMLElement | null>(null);
const flowInstance = ref<VueFlowStore | null>(null);
let suppressPaletteClick = false;

const selectedNodeId = ref<string | null>(null);
const selectedNode = ref<Node | null>(null);
const selectedEdgeId = ref<string | null>(null);

onMounted(async () => {
  document.addEventListener("drop", onGlobalDragEnd);
  document.addEventListener("dragend", onGlobalDragEnd);
  document.addEventListener("keydown", onKeyDown);
  const controller = new AbortController();
  resourceController = controller;
  await Promise.all([
    loadWorkflow(controller.signal),
    loadCanvas(controller.signal),
    loadAvailableChatModels(controller.signal),
    loadAvailableKnowledgeBases(controller.signal),
    loadAvailableMcpServers(controller.signal),
    loadAvailableTools(controller.signal)
  ]);
  if (resourceController === controller) {
    resourceController = null;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("drop", onGlobalDragEnd);
  document.removeEventListener("dragend", onGlobalDragEnd);
  document.removeEventListener("keydown", onKeyDown);
  document.body.style.userSelect = "";
  testRunController?.abort();
  testRunController = null;
  historyController?.abort();
  historyController = null;
  resourceController?.abort();
  resourceController = null;
});

async function loadWorkflow(signal?: AbortSignal) {
  try {
    workflow.value = await getWorkflow(workflowId, signal);
  } catch (error) {
    if (!isRequestCanceled(error)) {
      resourceError.value = extractApiErrorMessage(error, "加载工作流失败");
    }
  }
}

async function loadCanvas(signal?: AbortSignal) {
  try {
    applyCanvas(await getCanvas(workflowId, signal));
  } catch (error) {
    if (!isRequestCanceled(error)) {
      resourceError.value = extractApiErrorMessage(error, "加载工作流画布失败");
    }
  }
}

function applyCanvas(canvas: WorkflowCanvas) {
  const nodeKeyById = new Map(
    canvas.nodes.flatMap((node) => node.id === undefined ? [] : [[node.id, node.nodeKey] as const])
  );
  const snapshot = canvasHydration.stage(
    canvas.nodes.map(toVueFlowNode),
    canvas.edges.map((edge) => toVueFlowEdge(edge, nodeKeyById)),
  );
  replaceCanvasElements(snapshot.nodes, snapshot.edges);
  void synchronizeHydratedCanvas();
}

function toVueFlowNode(n: WorkflowNodeItem): Node {
  return {
    id: n.nodeKey,
    type: n.nodeType.toLowerCase(),
    position: { x: n.positionX, y: n.positionY },
    draggable: true,
    selectable: true,
    connectable: true,
    data: {
      label: n.name,
      nodeKey: n.nodeKey,
      configJson: n.configJson,
    },
  };
}

function toVueFlowEdge(e: WorkflowEdgeItem, nodeKeyById: Map<number, string>): Edge {
  const source = nodeKeyById.get(e.sourceNodeId);
  const target = nodeKeyById.get(e.targetNodeId);
  if (!source || !target) {
    throw new Error("工作流画布包含指向不存在节点的连线。");
  }
  return {
    id: String(e.id),
    source,
    target,
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

  addNode(type, getDropPosition(event));
  onGlobalDragEnd();
}

function addNode(type: string, position?: XYPosition) {
  const labels: Record<string, string> = {
    start: "开始",
    llm: "LLM",
    knowledge: "知识检索",
    tool: "工具调用",
    condition: "条件判断",
    loop: "循环",
    end: "结束",
  };

  const nodeKey = createUniqueNodeKey(type, nodes.value.map((node) => node.id));

  const newNode: Node = {
    id: nodeKey,
    type,
    position: position ?? {
      x: 40 + (nodes.value.length % 3) * 220,
      y: 40 + Math.floor(nodes.value.length / 3) * 120
    },
    draggable: true,
    selectable: true,
    connectable: true,
    data: {
      label: labels[type] || type,
      nodeKey,
      configJson: createNewNodeConfigJson(type),
    },
  };

  nodes.value = [...nodes.value, newNode];
  selectedNodeId.value = newNode.id;
  selectedNode.value = newNode;
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
  const snapshot = canvasHydration.markPaneReady();
  if (snapshot) {
    replaceCanvasElements(snapshot.nodes, snapshot.edges);
    void synchronizeHydratedCanvas();
  } else {
    instance.setNodes(nodes.value);
    instance.setEdges(edges.value);
  }
}

async function synchronizeHydratedCanvas() {
  const snapshot = canvasHydration.readySnapshot();
  if (!snapshot) return;

  replaceCanvasElements(snapshot.nodes, snapshot.edges);
  await nextTick();
  const latest = canvasHydration.readySnapshot();
  if (!latest || latest.revision !== snapshot.revision) return;

  replaceCanvasElements(snapshot.nodes, snapshot.edges);
  await nextTick();
  canvasHydration.complete(snapshot.revision);
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
  return {
    currentNodes: nodes.value,
    currentEdges: edges.value,
  };
}

function canCreateConnection(
  connection: Connection,
  sourceNode?: GraphNode | Node,
  targetNode?: GraphNode | Node,
  rejectDuplicate = true,
): boolean {
  if (!connection.source || !connection.target || connection.source === connection.target) return false;
  const { currentNodes, currentEdges } = getCurrentCanvasState();
  const source = sourceNode ?? currentNodes.find((node) => node.id === connection.source);
  const target = targetNode ?? currentNodes.find((node) => node.id === connection.target);
  if (!source || !target) return false;
  if (rejectDuplicate && currentEdges.some((edge) => isSameConnection(edge, connection))) return false;
  if (target.type === "start") return false;
  if (source.type === "end") return false;
  return true;
}

function isValidConnection(connection: Connection, elements: { sourceNode: GraphNode; targetNode: GraphNode }): boolean {
  // Vue Flow also calls this validator while hydrating persisted edges. Duplicate rejection
  // belongs in onConnect; checking refs here would reject the very edge setEdges is loading.
  return canCreateConnection(connection, elements.sourceNode, elements.targetNode, false);
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

function onConnect(connection: Connection) {
  if (!canCreateConnection(connection)) {
    return;
  }
  const edge = toWorkflowEdge(connection);
  replaceCanvasElements(nodes.value, appendCanvasEdge(edges.value, edge));
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

function replaceCanvasElements(nextNodes: Node[], nextEdges: Edge[]) {
  nodes.value = nextNodes;
  edges.value = nextEdges;
  if (flowInstance.value) {
    flowInstance.value.setNodes(nextNodes);
    flowInstance.value.setEdges(nextEdges);
  }
}

function deleteNode(nodeId: string) {
  const { currentNodes, currentEdges } = getCurrentCanvasState();
  const references = findNodeVariableReferences(
    currentNodes.filter((node) => node.id !== nodeId),
    nodeId
  );
  if (references.length) {
    const affected = references.map((reference) => `“${reference.nodeLabel}” [${reference.nodeKey}]`).join("、");
    if (!window.confirm(`节点被 ${affected} 的变量引用。删除后这些引用将失效，且修复前无法保存画布。仍要删除吗？`)) {
      return;
    }
  }
  const next = removeCanvasNode(currentNodes, currentEdges, nodeId);
  replaceCanvasElements(next.nodes, next.edges);

  if (selectedNodeId.value === nodeId) {
    selectedNodeId.value = null;
    selectedNode.value = null;
  }
  if (selectedEdgeId.value && !next.edges.some((edge) => edge.id === selectedEdgeId.value)) {
    selectedEdgeId.value = null;
  }
  if (references.length) {
    void nextTick(() => {
      saveMessage.value = "已删除被引用节点；请修复下游节点中的失效变量后再保存";
    });
  }
}

function deleteEdge(edgeId: string) {
  const { currentNodes, currentEdges } = getCurrentCanvasState();
  replaceCanvasElements(currentNodes, removeCanvasEdge(currentEdges, edgeId));
  if (selectedEdgeId.value === edgeId) {
    selectedEdgeId.value = null;
  }
}

function deleteSelectedElement() {
  if (selectedNodeId.value) {
    deleteNode(selectedNodeId.value);
    return;
  }
  if (selectedEdgeId.value) {
    deleteEdge(selectedEdgeId.value);
  }
}

function onKeyDown(event: KeyboardEvent) {
  const target = event.target;
  if (target instanceof HTMLElement) {
    const tagName = target.tagName.toLowerCase();
    if (target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select") {
      return;
    }
  }

  if ((event.key === "Delete" || event.key === "Backspace") && (selectedNodeId.value || selectedEdgeId.value)) {
    event.preventDefault();
    deleteSelectedElement();
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

  const variableIssues = validateCanvasWorkflowVariableReferences(currentNodes, currentEdges);
  if (variableIssues.length) {
    const firstIssue = variableIssues[0];
    saveMessage.value = `节点“${firstIssue.nodeLabel}”变量引用无效：${firstIssue.warning}`;
    return;
  }

  saving.value = true;
  saveMessage.value = "";

  const nodeIndexMap = new Map<string, number>();
  currentNodes.forEach((n, i) => nodeIndexMap.set(n.id, i));

  try {
    const savedCanvas = await saveCanvas(workflowId, {
      nodes: currentNodes.map(toCanvasNodePayload),
      edges: currentEdges.map((edge) => toCanvasEdgePayload(edge, nodeIndexMap)),
    });
    applyCanvas(savedCanvas);
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
  suppressPaletteClick = true;
  draggedType.value = nodeType;
  document.body.style.userSelect = "none";
  event.dataTransfer?.setData("application/vueflow", nodeType);
  event.dataTransfer!.effectAllowed = "move";
}

function onGlobalDragEnd() {
  draggedType.value = null;
  document.body.style.userSelect = "";
  globalThis.setTimeout(() => {
    suppressPaletteClick = false;
  }, 0);
}

function onPaletteClick(nodeType: string) {
  if (!suppressPaletteClick) {
    addNode(nodeType);
  }
}

function focusWorkflowTab(panel: "properties" | "test") {
  showTestPanel.value = panel === "test";
  void nextTick(() => {
    document.getElementById(`workflow-${panel}-tab`)?.focus();
  });
}

async function loadAvailableChatModels(signal?: AbortSignal) {
  loadingModels.value = true;
  try {
    const result = await fetchAllPages((page, size) => listModelConfigs(page, size, signal));
    if (signal?.aborted) return;
    availableChatModels.value = result.filter(
      (model) => model.enabled && model.modelType === "CHAT"
    );
    if (!testModelConfigId.value && availableChatModels.value.length > 0) {
      testModelConfigId.value = availableChatModels.value[0].id;
    }
  } catch (error) {
    if (!isRequestCanceled(error)) {
      resourceError.value = "加载聊天模型失败，请检查网络后重试。";
    }
  } finally {
    if (!signal?.aborted) {
      loadingModels.value = false;
    }
  }
}

async function loadAvailableKnowledgeBases(signal?: AbortSignal) {
  try {
    const result = await fetchAllPages((page, size) => listKnowledgeBases(page, size, signal));
    if (signal?.aborted) return;
    availableKnowledgeBases.value = result.filter((kb) => kb.enabled);
  } catch (error) {
    if (!isRequestCanceled(error)) {
      resourceError.value = "加载知识库失败，请检查网络后重试。";
    }
  }
}

async function loadAvailableMcpServers(signal?: AbortSignal) {
  try {
    const result = await fetchAllPages((page, size) => listMcpServers(page, size, signal));
    if (signal?.aborted) return;
    availableMcpServers.value = result;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      resourceError.value = "加载 MCP Server 失败，请检查网络后重试。";
    }
  }
}

async function loadAvailableTools(signal?: AbortSignal) {
  try {
    const result = await fetchAllPages((page, size) => listMcpTools(undefined, page, size, signal));
    if (signal?.aborted) return;
    availableTools.value = result;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      resourceError.value = "加载 MCP 工具失败，请检查网络后重试。";
    }
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
interface WorkflowExecutionHistory {
  id: number;
  triggerType: string;
  status: string;
  inputJson: string;
  outputJson: string;
  nodeCount: number;
  durationMs: number;
  errorMessage: string;
  createdAt: string;
}

const execHistory = ref<WorkflowExecutionHistory[]>([]);
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
  historyController?.abort();
  const controller = new AbortController();
  historyController = controller;
  historyError.value = "";
  try {
    const res = await authenticatedFetch(`/api/workflows/${workflowId}/executions?page=0&size=10`, {
      signal: controller.signal
    });
    if (!res.ok) {
      throw new Error(await extractFetchErrorMessage(res, "加载执行历史失败"));
    }
    const data = await res.json() as ApiResponse<PagedResponse<WorkflowExecutionHistory>>;
    if (!controller.signal.aborted) {
      execHistory.value = Array.isArray(data.data?.items) ? data.data.items : [];
    }
  } catch (error) {
    if (!isRequestCanceled(error)) {
      historyError.value = error instanceof Error ? error.message : "加载执行历史失败";
    }
  } finally {
    if (historyController === controller) historyController = null;
  }
}

async function runTest() {
  if (!testInput.value.trim() || !testModelConfigId.value) return;
  testRunning.value = true;
  testEvents.value = [];
  testFinalOutput.value = "";
  testError.value = "";

  testRunController?.abort();
  const controller = new AbortController();
  testRunController = controller;
  try {
    const draftCanvas = buildCanvasPayload();
    const response = await authenticatedFetch(`/api/workflows/${workflowId}/test-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: testInput.value,
        modelConfigId: testModelConfigId.value,
        canvas: draftCanvas,
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(await extractFetchErrorMessage(response, "测试运行失败"));
    }
    if (!response.body) {
      throw new Error("当前浏览器环境不支持测试流式响应。");
    }
    let completed = false;
    await consumeSseStream(response.body, ({ event, data: rawData }) => {
      const data = JSON.parse(rawData) as Record<string, unknown>;
      if (event === "completed") {
        completed = true;
        testFinalOutput.value = typeof data.finalOutput === "string" ? data.finalOutput : "";
      } else if (event === "error") {
        throw new Error(typeof data.message === "string" ? data.message : "测试运行失败");
      } else {
        testEvents.value.push({
          type: event,
          nodeName: typeof data.nodeName === "string" ? data.nodeName : "",
          output: typeof data.data === "object" && data.data ? data.data as Record<string, unknown> : undefined,
          data,
        });
      }
    }, { signal: controller.signal });
    if (!completed) {
      throw new Error("测试连接在完成前中断，请重试。");
    }
  } catch (e) {
    if (!isRequestCanceled(e)) {
      testError.value = e instanceof Error ? e.message : "测试运行失败";
    }
  } finally {
    if (testRunController === controller) {
      testRunning.value = false;
      testRunController = null;
      void loadHistory();
    }
  }
}

function buildCanvasPayload() {
  const { currentNodes, currentEdges } = getCurrentCanvasState();
  const nodeIndexMap = new Map<string, number>();
  currentNodes.forEach((node, index) => nodeIndexMap.set(node.id, index));

  return {
    nodes: currentNodes.map(toCanvasNodePayload),
    edges: currentEdges.map((edge) => toCanvasEdgePayload(edge, nodeIndexMap)),
  };
}

function toCanvasNodePayload(node: Node) {
  const nodeKey = typeof node.data?.nodeKey === "string" ? node.data.nodeKey : node.id;
  if (!nodeKeyPattern.test(nodeKey)) {
    throw new Error("节点 Key 必须是 1-64 位字母、数字、下划线或连字符。");
  }
  return {
    name: (node.data?.label as string) || node.type || "",
    nodeKey,
    nodeType: (node.type || "LLM").toUpperCase(),
    configJson: (node.data?.configJson as string) || "{}",
    positionX: Math.round(node.position.x),
    positionY: Math.round(node.position.y),
  };
}

function toCanvasEdgePayload(edge: Edge, nodeIndexMap: Map<string, number>) {
  const sourceNodeIndex = nodeIndexMap.get(edge.source);
  const targetNodeIndex = nodeIndexMap.get(edge.target);
  if (sourceNodeIndex === undefined || targetNodeIndex === undefined) {
    throw new Error("画布包含指向已删除节点的连线，请删除异常连线后重试。");
  }
  return {
    sourceNodeIndex,
    targetNodeIndex,
    sourceHandle: edge.sourceHandle || null,
    targetHandle: edge.targetHandle || null,
  };
}

watch(showTestPanel, (v) => { if (v) loadHistory(); });
</script>

<template>
  <div class="flex min-h-full flex-col lg:h-full lg:min-h-0">
    <!-- Top toolbar -->
    <div class="flex shrink-0 flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <button type="button" class="flex shrink-0 items-center gap-1 text-sm text-muted hover:text-ink" @click="goBack">
          <ArrowLeft class="h-4 w-4" />
          返回
        </button>
        <div class="h-5 w-px bg-line"></div>
        <h2 class="truncate text-sm font-semibold text-ink">
          {{ workflow?.name || "工作流画布" }}
        </h2>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-3">
        <span v-if="resourceError" class="max-w-sm truncate text-xs text-rose-500" role="alert">
          {{ resourceError }}
        </span>
        <span v-if="saveMessage" class="text-xs" :class="saveMessage === '画布已保存' ? 'text-emerald-600' : 'text-rose-500'">
          {{ saveMessage }}
        </span>
        <button
          v-if="selectedNodeId || selectedEdgeId"
          type="button"
          class="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
          :aria-label="selectedNodeId ? '删除选中节点' : '删除选中连线'"
          @click="deleteSelectedElement"
        >
          <Trash2 class="h-4 w-4" />
          {{ selectedNodeId ? "删除节点" : "删除连线" }}
        </button>
        <button
          type="button"
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
    <div class="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
      <!-- Left palette -->
      <div class="flex w-full shrink-0 gap-2 overflow-x-auto border-b border-line bg-white p-3 lg:w-40 lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0">
        <div class="mr-2 flex shrink-0 items-center text-xs font-semibold uppercase tracking-wide text-muted lg:mb-2 lg:mr-0">节点面板</div>
        <button
          v-for="item in paletteNodes"
          :key="item.type"
          type="button"
          draggable="true"
          class="flex shrink-0 cursor-grab items-center gap-2 rounded-xl border px-3 py-2.5 text-sm active:cursor-grabbing"
          :class="[item.bg, item.border]"
          :aria-label="`添加${item.label}节点`"
          @click="onPaletteClick(item.type)"
          @dragstart="onDragStart($event, item.type)"
          @dragend="onGlobalDragEnd"
        >
          <component :is="item.icon" class="h-4 w-4" :class="item.color" />
          <span class="text-sm font-medium">{{ item.label }}</span>
        </button>
      </div>

      <!-- Canvas -->
      <div ref="canvasContainer" class="h-[60vh] min-h-[420px] w-full min-w-0 shrink-0 lg:h-auto lg:min-h-0 lg:flex-1" @dragover="onDragOver" @drop="onDrop">
        <VueFlow
          v-model:nodes="flowNodes"
          v-model:edges="flowEdges"
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
          :auto-connect="false"
          :delete-key-code="null"
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
      <div class="flex min-h-[480px] w-full shrink-0 flex-col border-t border-line bg-white lg:min-h-0 lg:w-[360px] lg:border-t-0 lg:border-l">
        <div class="flex border-b border-line" role="tablist" aria-label="工作流侧边面板">
          <button
            id="workflow-properties-tab"
            type="button"
            role="tab"
            :aria-selected="!showTestPanel"
            aria-controls="workflow-properties-panel"
            class="flex-1 py-2.5 text-xs font-semibold transition"
            :class="!showTestPanel ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'"
            @click="showTestPanel = false"
            @keydown.right.prevent="focusWorkflowTab('test')"
          >属性</button>
          <button
            id="workflow-test-tab"
            type="button"
            role="tab"
            :aria-selected="showTestPanel"
            aria-controls="workflow-test-panel"
            class="flex-1 py-2.5 text-xs font-semibold transition"
            :class="showTestPanel ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'"
            @click="showTestPanel = true"
            @keydown.left.prevent="focusWorkflowTab('properties')"
          >🧪 测试</button>
        </div>

        <div
          v-if="!showTestPanel"
          id="workflow-properties-panel"
          role="tabpanel"
          aria-labelledby="workflow-properties-tab"
          class="min-h-0 flex-1 overflow-y-auto"
        >
          <NodeConfigPanel
            :selected-node="selectedNode"
            :available-model-configs="availableChatModels"
            :available-knowledge-bases="availableKnowledgeBases"
            :available-tools="availableTools"
            :available-mcp-servers="availableMcpServers"
            :canvas-nodes="nodes"
            :canvas-edges="edges"
            @update-label="onUpdateLabel"
            @update-config="onUpdateConfig"
            @delete-node="deleteNode"
            @close="onPaneClick"
          />
        </div>

        <!-- Test panel -->
        <div
          v-if="showTestPanel"
          id="workflow-test-panel"
          role="tabpanel"
          aria-labelledby="workflow-test-tab"
          class="flex flex-1 flex-col overflow-y-auto p-4"
        >
          <div class="mb-3 text-xs font-semibold text-ink">测试运行</div>

          <label for="workflow-test-input" class="mb-1 text-xs text-muted">输入消息</label>
          <textarea
            id="workflow-test-input"
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
            type="button"
            class="mb-4 flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-105 disabled:opacity-50"
            :disabled="testRunning || !testInput.trim() || !testModelConfigId"
            @click="runTest"
          >
            <Loader2 v-if="testRunning" class="h-4 w-4 animate-spin" />
            <FlaskConical v-else class="h-4 w-4" />
            {{ testRunning ? "运行中..." : "运行测试" }}
          </button>

          <div v-if="testError" class="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-600" role="alert">{{ testError }}</div>
          <div v-if="historyError" class="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700" role="alert">
            {{ historyError }}
          </div>

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
