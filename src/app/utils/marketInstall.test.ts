import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { usePaginatedAgentSelector } from "@/app/composables/usePaginatedAgentSelector";
import {
  buildMarketInstallPayload,
  runMarketInstallOnce,
  validateMarketInstallForm,
} from "@/app/utils/marketInstall";
import type { Agent } from "@/app/types/agent";

function form(overrides: Partial<Parameters<typeof buildMarketInstallPayload>[0]> = {}) {
  return {
    name: " market agent ",
    targetModelConfigId: "12",
    targetOfficialModelConfigId: "",
    targetKnowledgeBaseId: "",
    targetRerankModelConfigId: "",
    targetEmbeddingModelConfigId: "34",
    targetCredentialId: "",
    enabled: true,
    ...overrides,
  };
}

describe("market install form", () => {
  it("keeps the embedding target when installing an Agent with packaged knowledge", () => {
    expect(buildMarketInstallPayload(form())).toEqual({
      name: "market agent",
      targetModelConfigId: 12,
      targetOfficialModelConfigId: undefined,
      targetKnowledgeBaseId: undefined,
      targetRerankModelConfigId: undefined,
      targetEmbeddingModelConfigId: 34,
      targetCredentialId: undefined,
      enabled: true,
    });
  });

  it("rejects an Agent install without any chat model target", () => {
    expect(validateMarketInstallForm("AGENT", form({
      targetModelConfigId: "",
      targetOfficialModelConfigId: "",
    }))).toContain("聊天模型");
  });

  it("requires an embedding model for a knowledge-base asset", () => {
    expect(validateMarketInstallForm("KNOWLEDGE_BASE", form({
      targetEmbeddingModelConfigId: "",
    }))).toContain("Embedding");
  });

  it("keeps a page-51 Agent selectable after the market source list is searched", async () => {
    const page51Agent = { id: 10_001, name: "page-51-agent" } as Agent;
    const searchedAgent = { id: 7, name: "searched-agent" } as Agent;
    const loadPage = vi.fn(async (page: number, size: number, _signal?: AbortSignal, search?: string) => ({
      items: page === 50 && !search ? [page51Agent] : search === "searched" ? [searchedAgent] : [],
      page,
      size,
      total: search ? 1 : 10_002,
      totalPages: search ? 1 : 201,
    }));
    const selectedAgentId = ref("");
    const selector = usePaginatedAgentSelector(selectedAgentId, { pageSize: 200, loadPage });

    await selector.loadAgentPage(50, undefined, "");
    selectedAgentId.value = "10001";
    await nextTick();
    selector.agentSearchInput.value = "searched";
    await selector.searchAgents();

    expect(loadPage).toHaveBeenNthCalledWith(1, 50, 200, undefined, undefined);
    expect(loadPage).toHaveBeenNthCalledWith(2, 0, 200, undefined, "searched");
    expect(selector.agentOptions.value.map((option) => option.value)).toEqual(["10001", "7"]);
  });

  it("allows only one in-flight install when click and form submit fire together", async () => {
    let finishInstall: ((value: number) => void) | undefined;
    const install = vi.fn(() => new Promise<number>((resolve) => {
      finishInstall = resolve;
    }));
    const lock = ref(false);

    const clickAttempt = runMarketInstallOnce(lock, install);
    const submitAttempt = runMarketInstallOnce(lock, install);

    expect(lock.value).toBe(true);
    expect(install).toHaveBeenCalledOnce();
    await expect(submitAttempt).resolves.toBeUndefined();

    finishInstall?.(88);
    await expect(clickAttempt).resolves.toBe(88);
    expect(lock.value).toBe(false);
  });
});
