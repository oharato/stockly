import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { APIRequestContext, APIResponse, BrowserContext, Page, Route } from "@playwright/test";
import { cleanupTestUserStocks, setupCloudflareAccessProxy } from "./e2e/helpers/cf-proxy";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function response(status = 200, body: unknown = { stocks: [] }): APIResponse {
  return {
    ok: () => status >= 200 && status < 300,
    status: () => status,
    json: async () => body,
    headersArray: () => [],
  } as unknown as APIResponse;
}

function proxyMocks() {
  let handler!: (route: Route) => Promise<void>;
  const active = new Set<Promise<void>>();
  const context = {
    addCookies: vi.fn(),
    route: vi.fn(async (_pattern: string, callback: typeof handler) => {
      handler = callback;
    }),
    // Model Playwright's documented wait behavior; teardown must request it.
    unrouteAll: vi.fn(async (options: { behavior?: string }) => {
      if (options.behavior === "wait") await Promise.all(active);
    }),
  };
  const page = { addInitScript: vi.fn(), on: vi.fn() };
  const request = { get: vi.fn().mockResolvedValue(response()), fetch: vi.fn() };
  const route = {
    request: () => ({
      url: () => "https://stockly.ohchans.com/api/stocks/test-stock",
      method: () => "DELETE",
      postData: () => null,
      headers: () => ({}),
    }),
    fulfill: vi.fn(),
    abort: vi.fn(),
  };
  return {
    context,
    request,
    route,
    setup: () =>
      setupCloudflareAccessProxy(
        context as unknown as BrowserContext,
        page as unknown as Page,
        request as unknown as APIRequestContext,
      ),
    dispatch: () => {
      const pending = handler(route as unknown as Route);
      active.add(pending);
      return pending;
    },
  };
}

beforeEach(() => {
  vi.stubEnv("CF_ACCESS_CLIENT_ID", "test-client-id");
  vi.stubEnv("CF_ACCESS_CLIENT_SECRET", "test-client-secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Cloudflare proxy lifecycle", () => {
  it("drains delayed fetch and fulfill before request-context teardown", async () => {
    const mocks = proxyMocks();
    const upstream = deferred<APIResponse>();
    const fulfilled = deferred<void>();
    mocks.request.fetch.mockReturnValue(upstream.promise);
    mocks.route.fulfill.mockReturnValue(fulfilled.promise);
    const stop = await mocks.setup();
    const pending = mocks.dispatch();
    const dispose = vi.fn();
    const teardown = stop().then(dispose);

    await Promise.resolve();
    expect(mocks.context.unrouteAll).toHaveBeenCalledWith({ behavior: "wait" });
    expect(dispose).not.toHaveBeenCalled();
    const result = response();
    upstream.resolve(result);
    await Promise.resolve();
    expect(mocks.route.fulfill).toHaveBeenCalledWith({ response: result });
    expect(dispose).not.toHaveBeenCalled();

    fulfilled.resolve();
    await pending;
    await teardown;
    expect(dispose).toHaveBeenCalledOnce();
    expect(mocks.route.abort).not.toHaveBeenCalled();
  });

  it("aborts once when upstream fetch fails", async () => {
    const mocks = proxyMocks();
    mocks.request.fetch.mockRejectedValue(new Error("upstream unavailable"));
    await mocks.setup();
    await mocks.dispatch();
    expect(mocks.route.abort).toHaveBeenCalledOnce();
    expect(mocks.route.fulfill).not.toHaveBeenCalled();
  });

  it("does not abort a route that failed during fulfill", async () => {
    const mocks = proxyMocks();
    mocks.request.fetch.mockResolvedValue(response());
    mocks.route.fulfill.mockRejectedValue(new Error("Route is already handled!"));
    await mocks.setup();
    await expect(mocks.dispatch()).rejects.toThrow("Route is already handled!");
    expect(mocks.route.fulfill).toHaveBeenCalledOnce();
    expect(mocks.route.abort).not.toHaveBeenCalled();
  });
});

describe("test-user cleanup", () => {
  function cleanupRequest(listResponse: APIResponse, deleteStatus = 200) {
    const request = {
      get: vi.fn().mockResolvedValue(listResponse),
      delete: vi.fn().mockResolvedValue(response(deleteStatus)),
    };
    return { request, run: () => cleanupTestUserStocks(request as unknown as APIRequestContext) };
  }

  it("fails when the stock list request fails instead of reporting successful cleanup", async () => {
    const mocks = cleanupRequest(response(503));
    await expect(mocks.run()).rejects.toThrow("HTTP 503");
    expect(mocks.request.delete).not.toHaveBeenCalled();
  });

  it("rejects an invalid stock list", async () => {
    const mocks = cleanupRequest(response(200, {}));
    await expect(mocks.run()).rejects.toThrow("Invalid stock list");
    expect(mocks.request.delete).not.toHaveBeenCalled();
  });

  it("reports failed deletions", async () => {
    const mocks = cleanupRequest(response(200, { stocks: [{ id: "test-stock" }] }), 500);
    await expect(mocks.run()).rejects.toThrow("HTTP 500");
    expect(mocks.request.delete).toHaveBeenCalledWith(
      "https://stockly.ohchans.com/api/stocks/test-stock",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Stockly-User-Id": "e2e-test" }),
      }),
    );
  });

  it.each([200, 204, 404])("accepts DELETE HTTP %s", async (status) => {
    vi.useFakeTimers();
    const mocks = cleanupRequest(response(200, { stocks: [{ id: "test-stock" }] }), status);
    const cleanup = mocks.run();
    await vi.runAllTimersAsync();
    await expect(cleanup).resolves.toBeUndefined();
  });
});
