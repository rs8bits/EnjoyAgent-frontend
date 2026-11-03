// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  sandboxStatus: vi.fn(), listFiles: vi.fn(), listSandboxTasks: vi.fn(), getSandboxTask: vi.fn(),
  uploadFile: vi.fn(), previewFile: vi.fn(), fileBlob: vi.fn(), createSandboxTask: vi.fn(), cancelSandboxTask: vi.fn()
}));
vi.mock("@/app/services/files", () => api);
import FileWorkspacePage from "@/app/pages/FileWorkspacePage.vue";
import ArtifactCard from "@/app/components/files/ArtifactCard.vue";

const task = { id: "task-1", operation: "PYTHON", status: "RUNNING", stepKey: "execute", cancelRequested: false, createdAt: "2026-11-02T01:00:00Z", completedAt: null, errorCode: null, errorMessage: null };
const artifact = { id: "file-1", name: "<img src=x onerror=alert(1)>.csv", mediaType: "text/csv", sizeBytes: 8, sha256: "a".repeat(64), kind: "ARTIFACT" as const, status: "READY", createdAt: task.createdAt, taskId: task.id, stepKey: "execute" };
const detail = { task, executionId: "execution-1", timeoutSeconds: 120, inputs: [], artifacts: [artifact], execution: { exit_code: null, oom_killed: false, stdout: "saved log", stderr: "", stdout_truncated: false, stderr_truncated: false, image_id: null, resource_usage: {} } };
const page = <T,>(items: T[]) => ({ items, page: 0, size: 20, total: items.length, totalPages: items.length ? 1 : 0 });
let wrapper: ReturnType<typeof mount> | undefined;
beforeEach(() => {
  vi.resetAllMocks();
  api.sandboxStatus.mockResolvedValue({ enabled: true, ready: true, maxFileBytes: 20971520, defaultTimeoutSeconds: 120 });
  api.listFiles.mockResolvedValue(page([]));api.listSandboxTasks.mockResolvedValue(page([task]));api.getSandboxTask.mockResolvedValue(detail);
});
afterEach(() => { wrapper?.unmount(); wrapper = undefined; });

describe("file delivery workspace", () => {
  it("restores task history and saved logs after opening the page", async () => {
    wrapper = mount(FileWorkspacePage);await flushPromises();
    const history = wrapper.findAll("button").find(button => button.text().includes("Python 任务"));
    expect(history).toBeDefined();await history!.trigger("click");await flushPromises();
    expect(api.getSandboxTask).toHaveBeenCalledWith("task-1", expect.any(AbortSignal));
    expect(wrapper.text()).toContain("saved log");expect(wrapper.text()).toContain(artifact.name);
    expect(wrapper.find("img").exists()).toBe(false);
  });
  it("reuses the submission key when retrying an uncertain network result", async () => {
    api.createSandboxTask.mockRejectedValueOnce(new Error("网络中断")).mockResolvedValueOnce(task);
    wrapper = mount(FileWorkspacePage);await flushPromises();
    await wrapper.get("form").trigger("submit");await flushPromises();
    expect(wrapper.text()).toContain("网络中断");
    await wrapper.get("form").trigger("submit");await flushPromises();
    expect(api.createSandboxTask).toHaveBeenCalledTimes(2);
    expect(api.createSandboxTask.mock.calls[0]?.[1]).toBe(api.createSandboxTask.mock.calls[1]?.[1]);
    expect(api.createSandboxTask.mock.calls[0]?.[1]).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("cancels the selected durable task", async () => {
    api.cancelSandboxTask.mockResolvedValue({ ...task, cancelRequested: true });
    wrapper = mount(FileWorkspacePage);await flushPromises();
    await wrapper.findAll("button").find(button => button.text().includes("Python 任务"))!.trigger("click");await flushPromises();
    await wrapper.findAll("button").find(button => button.text() === "取消任务")!.trigger("click");await flushPromises();
    expect(api.cancelSandboxTask).toHaveBeenCalledWith(task.id);
  });
  it("artifact actions use the stored file identity and escape file names", async () => {
    wrapper = mount(ArtifactCard, { props: { file: artifact } });
    expect(wrapper.find("img").exists()).toBe(false);
    await wrapper.findAll("button")[0]!.trigger("click");await wrapper.findAll("button")[1]!.trigger("click");
    expect(wrapper.emitted("preview")?.[0]).toEqual([artifact]);expect(wrapper.emitted("download")?.[0]).toEqual([artifact]);
  });
});
