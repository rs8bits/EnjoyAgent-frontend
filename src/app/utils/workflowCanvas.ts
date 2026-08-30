export interface CanvasNodeLike {
  id: string;
}

export interface CanvasEdgeLike {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface CanvasHydrationSnapshot<TNode, TEdge> {
  revision: number;
  nodes: TNode[];
  edges: TEdge[];
}

export const DEFAULT_LLM_SYSTEM_PROMPT = "请根据以下直接上游节点输出完成任务：\n{{node_input}}";

export function createNewNodeConfigJson(nodeType: string) {
  if (nodeType.toLowerCase() === "llm") {
    return JSON.stringify({ systemPrompt: DEFAULT_LLM_SYSTEM_PROMPT });
  }
  return "{}";
}

export function createUniqueNodeKey(nodeType: string, existingKeys: string[]) {
  const base = nodeType.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "node";
  const pattern = new RegExp(`^${base}_(\\d+)$`);
  const maxSequence = existingKeys.reduce((maximum, key) => {
    const match = pattern.exec(key);
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);
  const occupied = new Set(existingKeys);
  let sequence = maxSequence + 1;
  while (occupied.has(`${base}_${sequence}`)) sequence += 1;
  return `${base}_${sequence}`;
}

export function removeCanvasNode<
  TNode extends CanvasNodeLike,
  TEdge extends CanvasEdgeLike
>(nodes: TNode[], edges: TEdge[], nodeId: string) {
  return {
    nodes: nodes.filter((node) => node.id !== nodeId),
    edges: edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
  };
}

export function removeCanvasEdge<TEdge extends CanvasEdgeLike>(edges: TEdge[], edgeId: string) {
  return edges.filter((edge) => edge.id !== edgeId);
}

function normalizeHandle(handle?: string | null) {
  return handle || null;
}

export function appendCanvasEdge<TEdge extends CanvasEdgeLike>(edges: TEdge[], edge: TEdge) {
  const duplicate = edges.some((current) => current.source === edge.source
    && current.target === edge.target
    && normalizeHandle(current.sourceHandle) === normalizeHandle(edge.sourceHandle)
    && normalizeHandle(current.targetHandle) === normalizeHandle(edge.targetHandle));
  return duplicate ? edges : [...edges, edge];
}

export function createCanvasHydrationCoordinator<TNode, TEdge>() {
  let paneReady = false;
  let revision = 0;
  let staged: CanvasHydrationSnapshot<TNode, TEdge> | null = null;
  let hydrating = false;

  return {
    stage(nodes: TNode[], edges: TEdge[]) {
      staged = { revision: ++revision, nodes, edges };
      hydrating = true;
      return staged;
    },
    markPaneReady() {
      paneReady = true;
      return paneReady && staged ? staged : null;
    },
    readySnapshot() {
      return paneReady && staged ? staged : null;
    },
    shouldAcceptNodes(nextNodes: TNode[]) {
      return !hydrating || !staged || nextNodes.length >= staged.nodes.length;
    },
    shouldAcceptEdges(nextEdges: TEdge[]) {
      return !hydrating || !staged || nextEdges.length >= staged.edges.length;
    },
    complete(completedRevision: number) {
      if (staged?.revision === completedRevision) {
        hydrating = false;
      }
    },
  };
}
