import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "@/app/services/pagination";

describe("fetchAllPages", () => {
  it("discovers total pages and loads every selector option", async () => {
    const loader = vi.fn(async (page: number, size: number) => ({
      items: [`page-${page}`],
      page,
      size,
      total: 3,
      totalPages: 3
    }));

    await expect(fetchAllPages(loader, 200)).resolves.toEqual(["page-0", "page-1", "page-2"]);
    expect(loader.mock.calls).toEqual([[0, 200], [1, 200], [2, 200]]);
  });

  it("does not make speculative calls for a single page", async () => {
    const loader = vi.fn(async (page: number, size: number) => ({
      items: ["only"],
      page,
      size,
      total: 1,
      totalPages: 1
    }));

    await expect(fetchAllPages(loader)).resolves.toEqual(["only"]);
    expect(loader).toHaveBeenCalledOnce();
  });
});
