import { describe, expect, it } from "vitest";
import {
  appendCanvasEdge,
  createCanvasHydrationCoordinator,
  createNewNodeConfigJson,
  createUniqueNodeKey,
  DEFAULT_LLM_SYSTEM_PROMPT,
  removeCanvasEdge,
  removeCanvasNode,
} from "@/app/utils/workflowCanvas";

describe("workflow canvas removal", () => {
  const nodes = [
    { id: "start", type: "start" },
    { id: "llm", type: "llm" },
    { id: "end", type: "end" },
  ];
  const edges = [
    { id: "start-llm", source: "start", target: "llm" },
    { id: "llm-end", source: "llm", target: "end" },
    { id: "start-end", source: "start", target: "end" },
  ];

  it("removes a node together with every incoming and outgoing edge", () => {
    expect(removeCanvasNode(nodes, edges, "llm")).toEqual({
      nodes: [nodes[0], nodes[2]],
      edges: [edges[2]],
    });
  });

  it("does not mutate the original canvas arrays", () => {
    removeCanvasNode(nodes, edges, "llm");

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(3);
  });

  it("removes only the requested edge", () => {
    expect(removeCanvasEdge(edges, "llm-end")).toEqual([edges[0], edges[2]]);
  });

  it("commits a newly connected edge synchronously and ignores duplicate events", () => {
    const connected = { id: "start-llm", source: "start", target: "llm" };
    const firstCommit = appendCanvasEdge([], connected);

    expect(firstCommit).toEqual([connected]);
    expect(appendCanvasEdge(firstCommit, { ...connected, id: "duplicate-event" })).toBe(firstCommit);
  });

  it("treats different source handles as independent branches", () => {
    const trueBranch = { id: "true", source: "condition", target: "end", sourceHandle: "true" };
    const falseBranch = { id: "false", source: "condition", target: "end", sourceHandle: "false" };

    expect(appendCanvasEdge([trueBranch], falseBranch)).toEqual([trueBranch, falseBranch]);
  });

  it("preserves server edges when the canvas response arrives before pane ready", () => {
    const coordinator = createCanvasHydrationCoordinator<object, { id: string }>();
    const edge = { id: "persisted-edge" };

    coordinator.stage([{ id: "start" }, { id: "end" }], [edge]);
    expect(coordinator.shouldAcceptEdges([])).toBe(false);
    expect(coordinator.markPaneReady()?.edges).toEqual([edge]);
  });

  it("preserves server edges when pane ready happens before the async response", () => {
    const coordinator = createCanvasHydrationCoordinator<object, { id: string }>();
    const edge = { id: "persisted-edge" };

    expect(coordinator.markPaneReady()).toBeNull();
    const staged = coordinator.stage([{ id: "start" }, { id: "end" }], [edge]);
    expect(coordinator.readySnapshot()?.edges).toEqual([edge]);
    expect(coordinator.shouldAcceptEdges([])).toBe(false);

    coordinator.complete(staged.revision);
    expect(coordinator.shouldAcceptEdges([])).toBe(true);
  });

  it("adds the upstream-output template only to newly created LLM nodes", () => {
    expect(JSON.parse(createNewNodeConfigJson("llm"))).toEqual({
      systemPrompt: DEFAULT_LLM_SYSTEM_PROMPT,
    });
    expect(DEFAULT_LLM_SYSTEM_PROMPT).toContain("{{node_input}}");
    expect(createNewNodeConfigJson("tool")).toBe("{}");
  });

  it("generates readable monotonic keys without changing existing keys", () => {
    const existing = ["llm_1", "node_legacy_uuid", "llm_3", "tool_1"];

    expect(createUniqueNodeKey("llm", existing)).toBe("llm_4");
    expect(createUniqueNodeKey("tool", existing)).toBe("tool_2");
    expect(existing).toEqual(["llm_1", "node_legacy_uuid", "llm_3", "tool_1"]);
  });
});
