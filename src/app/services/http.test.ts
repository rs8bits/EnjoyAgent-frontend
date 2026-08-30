import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatedFetch, joinApiUrl, setHttpUnauthorizedHandler } from "@/app/services/http";

describe("HTTP helpers", () => {
  afterEach(() => {
    setHttpUnauthorizedHandler(null);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("joins API bases without duplicate slashes", () => {
    expect(joinApiUrl("", "/api/auth/me")).toBe("/api/auth/me");
    expect(joinApiUrl("https://api.example.test/", "/api/auth/me")).toBe(
      "https://api.example.test/api/auth/me"
    );
  });

  it("always includes HttpOnly session cookies for fetch requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedFetch("/api/workflows/1/test-run", {
      method: "POST",
      credentials: "omit"
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "include"
    });
  });

  it("coalesces simultaneous unauthorized callbacks", async () => {
    let releaseHandler: (() => void) | undefined;
    const handler = vi.fn(() => new Promise<void>((resolve) => {
      releaseHandler = resolve;
    }));
    setHttpUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    const requests = [
      authenticatedFetch("/api/one"),
      authenticatedFetch("/api/two")
    ];
    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
    releaseHandler?.();
    await Promise.all(requests);

    expect(handler).toHaveBeenCalledOnce();
  });

  it("propagates an already-aborted caller signal", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.signal?.aborted).toBe(true);
      return Promise.reject(new DOMException("aborted", "AbortError"));
    }));

    await expect(
      authenticatedFetch("/api/slow", { signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("aborts a request when its header timeout expires", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        }, { once: true });
      })
    ));

    const request = authenticatedFetch("/api/slow", { timeoutMs: 50 });
    const assertion = expect(request).rejects.toThrow("请求超时");
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });
});
