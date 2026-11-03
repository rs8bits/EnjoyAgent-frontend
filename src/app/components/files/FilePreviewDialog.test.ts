// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ previewFile: vi.fn(), createSandboxTask: vi.fn(), getSandboxTask: vi.fn(), fileBlob: vi.fn(), downloadFileAsset: vi.fn() }));
vi.mock("@/app/services/files", () => api);
import FilePreviewDialog from "@/app/components/files/FilePreviewDialog.vue";
const file = { id: "file-1", name: "sales.xlsx", mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sizeBytes: 10, sha256: "a".repeat(64), kind: "INPUT" as const, status: "READY", createdAt: "2026-11-02T00:00:00Z", taskId: null, stepKey: null };
beforeEach(() => vi.resetAllMocks());
describe("artifact previews", () => {
  it("creates a scoped table-preview task and renders values as escaped text", async () => {
    api.previewFile.mockResolvedValue({ kind: "prepare", operation: "TABLE_INSPECT" });
    api.createSandboxTask.mockResolvedValue({ id: "task-1" });
    api.getSandboxTask.mockResolvedValue({ task: { status: "SUCCEEDED" }, artifacts: [{ ...file, id: "summary", name: "summary.json" }] });
    api.fileBlob.mockResolvedValue({ text: async () => JSON.stringify({ preview: [{ name: "<script>alert(1)</script>", amount: 30 }] }) });
    const wrapper = mount(FilePreviewDialog, { props: { file } });await flushPromises();
    expect(api.createSandboxTask).toHaveBeenCalledWith(expect.objectContaining({ operation: "TABLE_INSPECT", fileIds: [file.id] }), `preview-${file.id}-TABLE_INSPECT`);
    expect(wrapper.find("table").exists()).toBe(true);expect(wrapper.text()).toContain("<script>alert(1)</script>");expect(wrapper.find("script").exists()).toBe(false);wrapper.unmount();
  });
  it("keeps original download available when conversion fails", async () => {
    api.previewFile.mockRejectedValue(new Error("conversion unavailable"));api.downloadFileAsset.mockResolvedValue(undefined);
    const wrapper = mount(FilePreviewDialog, { props: { file } });await flushPromises();
    expect(wrapper.text()).toContain("conversion unavailable");
    await wrapper.findAll("button").find(button => button.text() === "下载原文件")!.trigger("click");
    expect(api.downloadFileAsset).toHaveBeenCalledWith(file);wrapper.unmount();
  });
});
