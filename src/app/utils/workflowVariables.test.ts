import { describe, expect, it } from "vitest";
import {
  buildWorkflowVariableGroups,
  extractWorkflowVariableReferences,
  findNodeVariableReferences,
  getDirectUpstreamNodes,
  getReachableUpstreamNodeIds,
  getWorkflowNodeOutputFields,
  insertTemplateVariable,
  validateCanvasWorkflowVariableReferences,
  validateWorkflowVariableReferences,
} from "@/app/utils/workflowVariables";

const nodes = [
  { id: "start", type: "start", data: { label: "开始", nodeKey: "start", configJson: "{}" } },
  { id: "draft", type: "llm", data: { label: "生成草稿", nodeKey: "draft", configJson: "{}" } },
  { id: "review", type: "llm", data: { label: "审核", nodeKey: "review", configJson: "{}" } },
  { id: "side", type: "tool", data: { label: "旁路工具", nodeKey: "side", configJson: "{}" } },
];
const edges = [
  { source: "start", target: "draft" },
  { source: "draft", target: "review" },
  { source: "start", target: "side" },
];

describe("workflow variable selector", () => {
  it("lists only reachable upstream nodes and persists the stable node key", () => {
    const groups = buildWorkflowVariableGroups("review", nodes, edges);

    expect(groups.map((group) => group.label)).toEqual([
      "工作流输入",
      "生成草稿 [draft]",
      "开始 [start]",
    ]);
    expect(groups[1].options[0]).toMatchObject({
      label: "模型输出",
      value: "{{draft.llm_output}}",
      nodeKey: "draft",
      field: "llm_output",
    });
    expect(groups.flatMap((group) => group.options).map((option) => option.value))
      .not.toContain("{{side.tool_result}}");
  });

  it("keeps persisted templates stable when a node display name changes", () => {
    const renamed = nodes.map((node) => node.id === "draft"
      ? { ...node, data: { ...node.data, label: "草稿（已重命名）" } }
      : node);
    const group = buildWorkflowVariableGroups("review", renamed, edges)[1];

    expect(group.label).toBe("草稿（已重命名） [draft]");
    expect(group.options[0].value).toBe("{{draft.llm_output}}");
  });

  it("walks cyclic input defensively without selecting the current node", () => {
    const upstream = getReachableUpstreamNodeIds("review", [
      ...edges,
      { source: "review", target: "draft" },
    ]);

    expect([...upstream.keys()]).toEqual(expect.arrayContaining(["draft", "start"]));
    expect(upstream.has("review")).toBe(false);
  });

  it("inserts a variable at the textarea selection without replacing other content", () => {
    expect(insertTemplateVariable("总结：旧内容。", "{{node_input}}", 3, 6)).toEqual({
      value: "总结：{{node_input}}。",
      caret: 3 + "{{node_input}}".length,
    });
  });

  it("exposes direct node inputs and read-only output contracts", () => {
    expect(getDirectUpstreamNodes("review", nodes, edges)).toEqual([{
      id: "draft",
      nodeKey: "draft",
      nodeLabel: "生成草稿",
      nodeType: "llm",
    }]);
    expect(getWorkflowNodeOutputFields("tool").map((item) => item.field)).toEqual([
      "tool_result",
      "tool_raw_response",
    ]);
    expect(getWorkflowNodeOutputFields("start").map((item) => item.field)).toEqual(["user_input"]);
  });

  it("extracts references and locates nodes that depend on a deleted key", () => {
    const source = "比较 {{draft.llm_output}} 与 {{user_input}}";
    expect(extractWorkflowVariableReferences(source)).toEqual([{
      nodeKey: "draft",
      field: "llm_output",
      template: "{{draft.llm_output}}",
    }]);

    expect(extractWorkflowVariableReferences("{{#draft.llm_output#}}"))
      .toEqual([{ nodeKey: "draft", field: "llm_output", template: "{{#draft.llm_output#}}" }]);
    expect(extractWorkflowVariableReferences("{{node_outputs.draft.llm_output}}"))
      .toEqual([{ nodeKey: "draft", field: "llm_output", template: "{{node_outputs.draft.llm_output}}" }]);
    expect(extractWorkflowVariableReferences("{{tool_1.tool_result.data.id}}"))
      .toEqual([{ nodeKey: "tool_1", field: "tool_result.data.id", template: "{{tool_1.tool_result.data.id}}" }]);

    const consumers = findNodeVariableReferences([
      ...nodes,
      { id: "consumer", type: "llm", data: { label: "消费者", configJson: JSON.stringify({ systemPrompt: source }) } },
    ], "draft");
    expect(consumers).toEqual([{ nodeId: "consumer", nodeKey: "consumer", nodeLabel: "消费者" }]);
  });

  it("warns about missing and no-longer-upstream references", () => {
    expect(validateWorkflowVariableReferences(
      "{{missing.llm_output}} / {{side.tool_result}}",
      "review",
      nodes,
      edges
    )).toEqual([
      "变量引用的节点 missing 已不存在。",
      "节点“旁路工具”不是当前节点的可达上游。",
    ]);
  });

  it("blocks canvas validation for an unknown output field", () => {
    const configured = nodes.map((node) => node.id === "review"
      ? { ...node, data: { ...node.data, configJson: JSON.stringify({ systemPrompt: "{{draft.missing_field}}" }) } }
      : node);

    expect(validateCanvasWorkflowVariableReferences(configured, edges)).toEqual([{
      nodeId: "review",
      nodeKey: "review",
      nodeLabel: "审核",
      warning: "节点“生成草稿”没有输出字段 missing_field。",
    }]);
  });

  it("rejects ambiguous node_input at business fan-in but keeps single-upstream compatibility", () => {
    const fanInEdges = [...edges, { source: "side", target: "review" }];

    expect(validateWorkflowVariableReferences(
      "请处理 {{node_input}}",
      "review",
      nodes,
      fanInEdges
    )).toEqual(["node_input 有歧义，请选择具体 nodeKey.field。"]);
    expect(validateWorkflowVariableReferences(
      "请处理 {{node_input}}",
      "review",
      nodes,
      edges
    )).toEqual([]);
    expect(validateWorkflowVariableReferences(
      "请处理 {{node_input}}",
      "draft",
      nodes,
      edges
    )).toEqual([]);
  });
});
