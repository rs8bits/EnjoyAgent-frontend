// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SandboxNodeConfig from "./SandboxNodeConfig.vue";
describe("sandbox workflow inputs", () => {
  it("preserves a typed upstream file list selector", async () => {
    const wrapper = mount(SandboxNodeConfig, { props: { config: { operation: "PYTHON", fileIds: [] } } });
    await wrapper.findAll("textarea")[0]!.setValue("{{previous.artifact_ids}}");
    expect(wrapper.emitted("change")?.at(-1)?.[0]).toMatchObject({ fileIds: "{{previous.artifact_ids}}" });wrapper.unmount();
  });
  it("rejects malformed JSON without replacing valid persisted arguments", async () => {
    const wrapper = mount(SandboxNodeConfig, { props: { config: { operation: "PDF_RENDER", arguments: { dpi: 120 } } } });
    await wrapper.findAll("textarea")[1]!.setValue("{broken}");
    expect(wrapper.text()).toContain("处理参数必须为 JSON 对象");expect(wrapper.emitted("change")).toBeUndefined();wrapper.unmount();
  });
});
