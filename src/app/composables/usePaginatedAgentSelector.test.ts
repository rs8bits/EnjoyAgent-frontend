import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { usePaginatedAgentSelector } from "@/app/composables/usePaginatedAgentSelector";
import type { Agent } from "@/app/types/agent";

function agent(id: number, name = `agent-${id}`) {
  return {
    id,
    name,
    chatModelBindingType: "USER_MODEL"
  } as Agent;
}

describe("usePaginatedAgentSelector", () => {
  it("loads only the first page even when the tenant owns thousands of agents", async () => {
    const loadPage = vi.fn(async (page: number, size: number) => ({
      items: Array.from({ length: size }, (_, index) => agent(page * size + index + 1)),
      page,
      size,
      total: 10_002,
      totalPages: 501
    }));
    const selectedAgentId = ref("");
    const selector = usePaginatedAgentSelector(selectedAgentId, { loadPage });

    await selector.initializeAgents();

    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(loadPage).toHaveBeenCalledWith(0, 20, undefined, undefined);
    expect(selector.agentOptions.value).toHaveLength(20);
    expect(selectedAgentId.value).toBe("1");
  });

  it("searches and paginates on the server while keeping an off-page selection available", async () => {
    const pages = new Map<string, Agent[]>([
      ["0:", [agent(1), agent(2)]],
      ["0:billing", [agent(41, "billing-primary"), agent(42, "billing-backup")]],
      ["1:billing", [agent(43, "billing-archive")]]
    ]);
    const loadPage = vi.fn(async (page: number, size: number, _signal?: AbortSignal, search?: string) => ({
      items: pages.get(`${page}:${search ?? ""}`) ?? [],
      page,
      size,
      total: search ? 3 : 10_002,
      totalPages: search ? 2 : 5_001
    }));
    const selectedAgentId = ref("");
    const selector = usePaginatedAgentSelector(selectedAgentId, { loadPage });
    await selector.initializeAgents();

    selector.agentSearchInput.value = " billing ";
    await selector.searchAgents();
    selectedAgentId.value = "42";
    await nextTick();
    await selector.loadAgentPage(1);

    expect(loadPage.mock.calls).toEqual([
      [0, 20, undefined, undefined],
      [0, 20, undefined, "billing"],
      [1, 20, undefined, "billing"]
    ]);
    expect(selector.activeAgent.value?.name).toBe("billing-backup");
    expect(selector.agentOptions.value.map((option) => option.value)).toEqual(["42", "43"]);
  });

  it("resolves a route-selected agent by id without scanning intervening pages", async () => {
    const loadPage = vi.fn(async (page: number, size: number) => ({
      items: [agent(1)],
      page,
      size,
      total: 10_002,
      totalPages: 501
    }));
    const loadOne = vi.fn(async (id: number) => agent(id, "route-agent"));
    const selectedAgentId = ref("");
    const selector = usePaginatedAgentSelector(selectedAgentId, { loadPage, loadOne });

    await selector.initializeAgents(9_999);

    expect(loadPage).toHaveBeenCalledTimes(1);
    expect(loadOne).toHaveBeenCalledWith(9_999, undefined);
    expect(selectedAgentId.value).toBe("9999");
    expect(selector.agentOptions.value.map((option) => option.value)).toEqual(["9999", "1"]);
  });
});
