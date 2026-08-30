import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("@/app/services/http", () => ({
  extractPagedResponseData: vi.fn(),
  http: { post: postMock },
}));

import { installMarketAsset } from "@/app/services/market";

describe("market install service", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("posts every selected install dependency and returns the created object", async () => {
    const result = {
      marketAssetId: 7,
      assetType: "AGENT",
      installedEntityId: 88,
      installedName: "installed-agent",
      relatedResources: [],
      setupRequired: false,
      setupItems: [],
    };
    const payload = {
      name: "installed-agent",
      targetModelConfigId: 12,
      targetEmbeddingModelConfigId: 34,
      enabled: true,
    };
    postMock.mockResolvedValue({ data: { data: result } });

    await expect(installMarketAsset(7, payload)).resolves.toEqual(result);
    expect(postMock).toHaveBeenCalledWith("/api/market/assets/7/install", payload);
  });

  it("keeps a backend install failure observable to the page", async () => {
    const error = new Error("Required model config is missing");
    postMock.mockRejectedValue(error);

    await expect(installMarketAsset(7, { enabled: true })).rejects.toBe(error);
  });
});
