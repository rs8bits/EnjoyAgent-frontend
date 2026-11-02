// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/app/services/http", () => ({ http: { get, post }, extractApiErrorMessage: (_: unknown, message: string) => message }));
import Panel from "./McpConfirmationPanel.vue";
const proposal = () => ({ id: "frozen-id", toolId: 7, toolName: "delete_record", arguments: { id: 42, note: "<script>alert(1)</script>" }, status: "PENDING", expiresAt: "2099-01-01T00:00:00Z" });
describe("MCP frozen operation confirmation", () => {
 beforeEach(() => { get.mockReset(); post.mockReset(); get.mockResolvedValue({ data: { data: [] } }); });
 it("renders escaped arguments and posts only the confirmation id", async () => {
   post.mockResolvedValue({ data: { data: { status: "EXECUTED" } } });
   const wrapper = mount(Panel, { props: { proposals: [proposal()] } });
   expect(wrapper.find("script").exists()).toBe(false);
   expect(wrapper.text()).toContain("<script>alert(1)</script>");
   await wrapper.findAll("button")[0]!.trigger("click"); await flushPromises();
   expect(post).toHaveBeenCalledExactlyOnceWith("/api/mcp/confirmations/frozen-id/confirm");
   expect(wrapper.emitted("resolved")).toEqual([["frozen-id"]]); wrapper.unmount();
 });
 it("restores pending proposals after refresh and blocks duplicate submits", async () => {
   get.mockResolvedValue({ data: { data: [proposal()] } });
   let resolve!: (value: unknown) => void;
   post.mockImplementation(() => new Promise(done => { resolve = done; }));
   const wrapper = mount(Panel, { props: { sessionId: 9, proposals: [] } }); await flushPromises();
   const button = wrapper.findAll("button")[0]!; await button.trigger("click");
   expect(button.attributes("disabled")).toBeDefined();
   expect(post).toHaveBeenCalledTimes(1);
   resolve({ data: { data: { status: "EXECUTED" } } }); await flushPromises(); wrapper.unmount();
 });
 it("does not resume the task after cancellation", async () => {
   post.mockResolvedValue({ data: { data: null } });
   const wrapper = mount(Panel, { props: { proposals: [proposal()] } });
   await wrapper.findAll("button")[1]!.trigger("click"); await flushPromises();
   expect(wrapper.emitted("resolved")).toBeUndefined(); expect(wrapper.text()).toContain("CANCELLED");wrapper.unmount();
 });
});
