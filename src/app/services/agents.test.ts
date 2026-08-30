import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, extractPagedResponseDataMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  extractPagedResponseDataMock: vi.fn((response) => response.data.data)
}));

vi.mock("@/app/services/http", () => ({
  extractPagedResponseData: extractPagedResponseDataMock,
  http: { get: getMock }
}));

import { getAgent, listAgents } from "@/app/services/agents";

describe("Agent service paging contracts", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("passes the trimmed search term to one paged request", async () => {
    const page = { items: [], page: 2, size: 20, total: 0, totalPages: 0 };
    getMock.mockResolvedValue({ data: { data: page } });

    await expect(listAgents(2, 20, undefined, "  billing  ")).resolves.toEqual(page);

    expect(getMock).toHaveBeenCalledOnce();
    expect(getMock).toHaveBeenCalledWith("/api/agents", {
      params: { page: 2, size: 20, search: "billing" },
      signal: undefined
    });
  });

  it("loads a route-selected agent directly by id", async () => {
    const selected = { id: 9999, name: "route-agent" };
    getMock.mockResolvedValue({ data: { data: selected } });

    await expect(getAgent(9999)).resolves.toEqual(selected);
    expect(getMock).toHaveBeenCalledWith("/api/agents/9999", { signal: undefined });
  });
});
