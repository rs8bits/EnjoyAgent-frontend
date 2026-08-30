export interface Workflow {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  enabled: boolean;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNodeItem {
  id?: number;
  nodeKey: string;
  name: string;
  nodeType: string;
  configJson: string;
  positionX: number;
  positionY: number;
}

export interface WorkflowEdgeItem {
  id?: number;
  sourceNodeId: number;
  targetNodeId: number;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export interface WorkflowCanvas {
  workflow: Workflow;
  nodes: WorkflowNodeItem[];
  edges: WorkflowEdgeItem[];
}

export interface SaveCanvasPayload {
  nodes: {
    name: string;
    nodeKey: string;
    nodeType: string;
    configJson: string;
    positionX: number;
    positionY: number;
  }[];
  edges: {
    sourceNodeIndex: number;
    targetNodeIndex: number;
    sourceHandle: string | null;
    targetHandle: string | null;
  }[];
}

export interface CreateWorkflowPayload {
  name: string;
  description?: string;
}

export interface UpdateWorkflowPayload {
  name?: string;
  description?: string;
  enabled: boolean;
}
