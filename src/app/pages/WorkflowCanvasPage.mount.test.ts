// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "6" } }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/services/pagination", () => ({
  fetchAllPages: vi.fn(async () => []),
}));

vi.mock("@/app/services/workflow", () => ({
  getWorkflow: vi.fn(async () => workflow),
  getCanvas: vi.fn(async () => persistedCanvas),
  saveCanvas: vi.fn(),
}));

import WorkflowCanvasPage from "@/app/pages/WorkflowCanvasPage.vue";

const workflow = {
  id: 6,
  tenantId: 5,
  name: "persisted-edge-workflow",
  description: null,
  enabled: true,
  nodeCount: 2,
  edgeCount: 1,
  createdAt: "2026-08-11T00:00:00Z",
  updatedAt: "2026-08-11T00:00:00Z",
};

const persistedCanvas = {
  workflow,
  nodes: [
    {
      id: 32,
      nodeKey: "start_1",
      name: "开始",
      nodeType: "START",
      configJson: "{}",
      positionX: 40,
      positionY: 40,
    },
    {
      id: 33,
      nodeKey: "end_1",
      name: "结束",
      nodeType: "END",
      configJson: "{\"outputTemplate\":\"{{start_1.user_input}}\"}",
      positionX: 320,
      positionY: 40,
    },
  ],
  edges: [
    {
      id: 12,
      sourceNodeId: 32,
      targetNodeId: 33,
      sourceHandle: null,
      targetHandle: null,
    },
  ],
};

describe("WorkflowCanvas persisted edge hydration", () => {
  it("mounts the real Vue Flow canvas with the persisted start-to-end edge", async () => {
    const errors: unknown[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args);
    });
    const wrapper = mount(WorkflowCanvasPage, {
      attachTo: document.body,
    });

    await flushPromises();
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    await flushPromises();

    const state = wrapper.vm.$.setupState as unknown as {
      nodes: Array<{ id: string }>;
      edges: Array<{ id: string; source: string; target: string }>;
    };
    expect(state.nodes.map((node) => node.id)).toEqual(["start_1", "end_1"]);
    expect(state.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "12", source: "start_1", target: "end_1" }),
    ]));
    expect(errors.flat().join("\n")).not.toContain("An edge needs a source and a target");

    wrapper.unmount();
    consoleError.mockRestore();
  });
});
