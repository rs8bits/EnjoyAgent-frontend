export interface WorkflowVariableNode {
  id: string;
  type?: string;
  data?: {
    label?: unknown;
    nodeKey?: unknown;
    configJson?: unknown;
    [key: string]: unknown;
  };
}

export interface WorkflowVariableEdge {
  source: string;
  target: string;
}

export interface WorkflowVariableOption {
  label: string;
  value: string;
  description: string;
  nodeKey?: string;
  field?: string;
}

export interface WorkflowVariableGroup {
  label: string;
  options: WorkflowVariableOption[];
}

export interface WorkflowVariableReference {
  nodeKey: string;
  field: string;
  template: string;
}

export interface WorkflowNodeOutputField {
  field: string;
  label: string;
  description: string;
}

const OUTPUT_FIELDS: Record<string, WorkflowNodeOutputField[]> = {
  start: [
    { field: "user_input", label: "原始用户输入", description: "工作流开始时收到的原始用户输入" },
  ],
  llm: [
    { field: "llm_output", label: "模型输出", description: "LLM 生成的文本" },
    { field: "llm_provider", label: "模型提供商", description: "本次调用使用的 Provider" },
    { field: "llm_model", label: "模型名称", description: "本次调用使用的模型" },
    { field: "llm_prompt_tokens", label: "输入 Token", description: "本次调用的输入 Token 数" },
    { field: "llm_completion_tokens", label: "输出 Token", description: "本次调用的输出 Token 数" },
  ],
  knowledge: [
    { field: "retrieval_context", label: "检索上下文", description: "知识库召回并拼接后的文本" },
  ],
  tool: [
    { field: "tool_result", label: "工具结果", description: "适合继续交给模型的工具结果" },
    { field: "tool_raw_response", label: "工具原始响应", description: "MCP 工具返回的原始响应" },
  ],
  condition: [
    { field: "condition_result", label: "判断结果", description: "条件节点的布尔结果" },
  ],
  loop: [
    { field: "loop_iterations", label: "循环次数", description: "循环实际执行次数" },
    { field: "loop_break_reason", label: "结束原因", description: "循环退出原因" },
    { field: "body_outputs", label: "循环体输出", description: "循环体节点的结构化输出集合" },
  ],
  end: [
    { field: "final_output", label: "最终输出", description: "工作流最终输出文本" },
  ],
};

const FIELD_PATH = "([A-Za-z0-9_-]{1,64}(?:\\.[A-Za-z0-9_-]{1,64})*)";
const NODE_INPUT_PATTERN = /\{\{\s*node_input\s*}}/;
const STRUCTURED_REFERENCE_PATTERN = new RegExp(
  `\\{\\{([A-Za-z0-9_-]{1,64})\\.${FIELD_PATH}}}`
    + `|\\{\\{#([A-Za-z0-9_-]{1,64})\\.${FIELD_PATH}#}}`
    + `|\\{\\{\\s*node_outputs\\.([A-Za-z0-9_-]{1,64})\\.${FIELD_PATH}\\s*}}`,
  "g"
);

function nodeKeyOf(node: WorkflowVariableNode) {
  return typeof node.data?.nodeKey === "string" && node.data.nodeKey
    ? node.data.nodeKey
    : node.id;
}

function nodeLabelOf(node: WorkflowVariableNode) {
  return typeof node.data?.label === "string" && node.data.label.trim()
    ? node.data.label.trim()
    : nodeKeyOf(node);
}

export function getWorkflowNodeOutputFields(nodeType?: string) {
  return OUTPUT_FIELDS[(nodeType || "").toLowerCase()] || [];
}

export function getDirectUpstreamNodes(
  currentNodeId: string,
  nodes: WorkflowVariableNode[],
  edges: WorkflowVariableEdge[]
) {
  const sourceIds = new Set(
    edges.filter((edge) => edge.target === currentNodeId).map((edge) => edge.source)
  );
  return nodes
    .filter((node) => sourceIds.has(node.id))
    .map((node) => ({
      id: node.id,
      nodeKey: nodeKeyOf(node),
      nodeLabel: nodeLabelOf(node),
      nodeType: (node.type || "").toLowerCase(),
    }));
}

export function getReachableUpstreamNodeIds(
  currentNodeId: string,
  edges: WorkflowVariableEdge[]
) {
  const incomingByTarget = new Map<string, string[]>();
  edges.forEach((edge) => {
    incomingByTarget.set(edge.target, [...(incomingByTarget.get(edge.target) || []), edge.source]);
  });

  const distanceById = new Map<string, number>();
  const queue = (incomingByTarget.get(currentNodeId) || []).map((id) => ({ id, distance: 1 }));
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.id === currentNodeId) continue;
    const previousDistance = distanceById.get(current.id);
    if (previousDistance !== undefined && previousDistance <= current.distance) continue;
    distanceById.set(current.id, current.distance);
    (incomingByTarget.get(current.id) || []).forEach((id) => {
      queue.push({ id, distance: current.distance + 1 });
    });
  }
  return distanceById;
}

export function buildWorkflowVariableGroups(
  currentNodeId: string,
  nodes: WorkflowVariableNode[],
  edges: WorkflowVariableEdge[]
): WorkflowVariableGroup[] {
  const groups: WorkflowVariableGroup[] = [{
    label: "工作流输入",
    options: [
      {
        label: "原始用户输入",
        value: "{{user_input}}",
        description: "工作流开始时收到的原始用户输入",
      },
      {
        label: "直接上游输入（兼容）",
        value: "{{node_input}}",
        description: "当前节点的直接上游输出；适合简单单链工作流",
      },
    ],
  }];

  const upstreamDistance = getReachableUpstreamNodeIds(currentNodeId, edges);
  const sourceOrder = new Map(nodes.map((node, index) => [node.id, index]));
  const upstreamNodes = nodes
    .filter((node) => upstreamDistance.has(node.id))
    .sort((left, right) =>
      (upstreamDistance.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (upstreamDistance.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      || (sourceOrder.get(left.id) ?? 0) - (sourceOrder.get(right.id) ?? 0));

  upstreamNodes.forEach((node) => {
    const fields = getWorkflowNodeOutputFields(node.type);
    if (!fields.length) return;
    const nodeKey = nodeKeyOf(node);
    groups.push({
      label: `${nodeLabelOf(node)} [${nodeKey}]`,
      options: fields.map((field) => ({
        label: field.label,
        value: `{{${nodeKey}.${field.field}}}`,
        description: field.description,
        nodeKey,
        field: field.field,
      })),
    });
  });

  return groups;
}

export function insertTemplateVariable(
  source: string,
  variable: string,
  selectionStart = source.length,
  selectionEnd = selectionStart
) {
  const start = Math.max(0, Math.min(selectionStart, source.length));
  const end = Math.max(start, Math.min(selectionEnd, source.length));
  return {
    value: `${source.slice(0, start)}${variable}${source.slice(end)}`,
    caret: start + variable.length,
  };
}

export function extractWorkflowVariableReferences(source: string): WorkflowVariableReference[] {
  const references: WorkflowVariableReference[] = [];
  for (const match of source.matchAll(STRUCTURED_REFERENCE_PATTERN)) {
    let nodeKey = match[1] || match[3] || match[5];
    let field = match[2] || match[4] || match[6];
    if (nodeKey === "node_outputs") {
      const segments = field.split(".");
      if (segments.length < 2) continue;
      nodeKey = segments.shift() || "";
      field = segments.join(".");
    }
    references.push({
      nodeKey,
      field,
      template: match[0],
    });
  }
  return references;
}

export function findNodeVariableReferences(nodes: WorkflowVariableNode[], nodeKey: string) {
  return nodes.flatMap((node) => {
    const configJson = typeof node.data?.configJson === "string" ? node.data.configJson : "";
    const referenced = extractWorkflowVariableReferences(configJson)
      .some((reference) => reference.nodeKey === nodeKey);
    return referenced ? [{ nodeId: node.id, nodeKey: nodeKeyOf(node), nodeLabel: nodeLabelOf(node) }] : [];
  });
}

export function validateWorkflowVariableReferences(
  source: string,
  currentNodeId: string,
  nodes: WorkflowVariableNode[],
  edges: WorkflowVariableEdge[]
) {
  const upstreamIds = getReachableUpstreamNodeIds(currentNodeId, edges);
  const nodeByKey = new Map(nodes.map((node) => [nodeKeyOf(node), node]));
  const warnings = new Set<string>();

  if (NODE_INPUT_PATTERN.test(source)) {
    const directBusinessUpstreamCount = getDirectUpstreamNodes(currentNodeId, nodes, edges)
      .filter((node) => node.nodeType !== "start")
      .length;
    if (directBusinessUpstreamCount > 1) {
      warnings.add("node_input 有歧义，请选择具体 nodeKey.field。");
    }
  }

  extractWorkflowVariableReferences(source).forEach((reference) => {
    const referencedNode = nodeByKey.get(reference.nodeKey);
    if (!referencedNode) {
      warnings.add(`变量引用的节点 ${reference.nodeKey} 已不存在。`);
    } else if (!upstreamIds.has(referencedNode.id)) {
      warnings.add(`节点“${nodeLabelOf(referencedNode)}”不是当前节点的可达上游。`);
    } else if (!getWorkflowNodeOutputFields(referencedNode.type)
      .some((field) => field.field === reference.field.split(".")[0])) {
      warnings.add(`节点“${nodeLabelOf(referencedNode)}”没有输出字段 ${reference.field}。`);
    }
  });
  return [...warnings];
}

export function validateCanvasWorkflowVariableReferences(
  nodes: WorkflowVariableNode[],
  edges: WorkflowVariableEdge[]
) {
  return nodes.flatMap((node) => {
    const source = typeof node.data?.configJson === "string" ? node.data.configJson : "";
    return validateWorkflowVariableReferences(source, node.id, nodes, edges)
      .map((warning) => ({
        nodeId: node.id,
        nodeKey: nodeKeyOf(node),
        nodeLabel: nodeLabelOf(node),
        warning,
      }));
  });
}
