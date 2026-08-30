import { beforeEach, describe, expect, it, vi } from "vitest";

const { putMock } = vi.hoisted(() => ({ putMock: vi.fn() }));

vi.mock("@/app/services/http", () => ({
  extractPagedResponseData: vi.fn(),
  http: { put: putMock }
}));

import { updateAdminOfficialModelCredential } from "@/app/services/admin";

describe("admin service contracts", () => {
  beforeEach(() => {
    putMock.mockReset();
  });

  it("includes the provider required by the official credential update API", async () => {
    const credential = { id: 9, provider: "DASHSCOPE" };
    putMock.mockResolvedValue({ data: { data: credential } });
    const payload = {
      name: "百炼托管 Key",
      provider: "DASHSCOPE" as const,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
      enabled: true
    };

    await expect(updateAdminOfficialModelCredential(9, payload)).resolves.toEqual(credential);
    expect(putMock).toHaveBeenCalledWith(
      "/api/admin/official-models/credentials/9",
      payload
    );
  });
});
