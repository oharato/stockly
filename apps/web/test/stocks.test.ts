/// <reference types="svelte" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { StockItem } from "../src/types/stock";

const { deleteRequest, statsRequest } = vi.hoisted(() => ({
  deleteRequest: vi.fn<(args: { param: { id: string } }) => Promise<Response>>(),
  statsRequest: vi.fn<() => Promise<Response>>(),
}));

vi.mock("../src/lib/api", () => ({
  client: {
    api: {
      stocks: { ":id": { $delete: deleteRequest } },
      stats: { $get: statsRequest },
    },
  },
}));

import { stockStore } from "../src/lib/stocks.svelte";

const makeStock = (id: string, content = id, tags: string[] = []): StockItem => ({
  id,
  content,
  tags,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
});

const response = (status: number) => new Response(null, { status });

function seedStocks(items: StockItem[], total = items.length) {
  stockStore.allStocks = items;
  stockStore.stocks = items;
  stockStore.stats.total_stocks = total;
}

describe("StockStore.deleteStock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { navigator: { onLine: true } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    deleteRequest.mockReset();
    statsRequest.mockReset();
    stockStore.searchQuery = "";
    stockStore.selectedTag = null;
    stockStore.error = null;
    stockStore.isAuthError = false;
    stockStore.stats = { score: 30, total_stocks: 0, streak: 2, rediscovery_count: 1 };
    seedStocks([makeStock("first"), makeStock("target"), makeStock("last")], 12);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("removes the stock optimistically and keeps it removed after success", async () => {
    deleteRequest.mockResolvedValue(response(200));
    stockStore.error = "previous error";
    stockStore.isAuthError = true;

    const deletion = stockStore.deleteStock("target");

    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "last"]);
    expect(stockStore.stocks.map((s) => s.id)).toEqual(["first", "last"]);
    expect(stockStore.stats.total_stocks).toBe(11);
    expect(stockStore.error).toBeNull();
    expect(stockStore.isAuthError).toBe(false);
    await deletion;

    expect(deleteRequest).toHaveBeenCalledExactlyOnceWith({ param: { id: "target" } });
    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "last"]);
    expect(stockStore.stats).toEqual({
      score: 30,
      total_stocks: 11,
      streak: 2,
      rediscovery_count: 1,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("restores the stock and original total immediately after HTTP 500", async () => {
    deleteRequest.mockResolvedValue(response(500));

    await stockStore.deleteStock("target");

    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
    expect(stockStore.stocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
    // The server's total can differ from the number of locally cached stocks.
    expect(stockStore.stats.total_stocks).toBe(12);
    expect(stockStore.error).toBe("削除に失敗しました");
    expect(stockStore.isAuthError).toBe(false);
    expect(deleteRequest).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([true, false])(
    "restores the stock and exposes a fetch failure when online=%s",
    async (online) => {
      vi.stubGlobal("window", { navigator: { onLine: online } });
      deleteRequest.mockRejectedValue(new TypeError("Failed to fetch"));

      await stockStore.deleteStock("target");

      expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
      expect(stockStore.stocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
      expect(stockStore.stats.total_stocks).toBe(12);
      expect(stockStore.error).toBe(
        online
          ? "認証セッションが切れたか、保護されています。再読み込みしてログインしてください。"
          : "オフラインです。インターネット接続を確認してください。",
      );
      expect(stockStore.isAuthError).toBe(online);
      expect(deleteRequest).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([429, 503])(
    "restores the original stock after exhausting HTTP %i retries",
    async (status) => {
      deleteRequest.mockResolvedValue(response(status));

      const deletion = stockStore.deleteStock("target");
      await vi.advanceTimersByTimeAsync(0);
      expect(deleteRequest).toHaveBeenCalledTimes(1);

      for (const [index, delay] of [1500, 3000, 4500].entries()) {
        await vi.advanceTimersByTimeAsync(delay - 1);
        expect(deleteRequest).toHaveBeenCalledTimes(index + 1);
        expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "last"]);
        expect(stockStore.stats.total_stocks).toBe(11);
        expect(stockStore.error).toBeNull();
        await vi.advanceTimersByTimeAsync(1);
        expect(deleteRequest).toHaveBeenCalledTimes(index + 2);
      }
      await deletion;

      expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
      expect(stockStore.stocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
      expect(stockStore.stats.total_stocks).toBe(12);
      expect(stockStore.error).toBe("削除に失敗しました");
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("decrements the total only once when a throttled deletion later succeeds", async () => {
    deleteRequest
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));

    const deletion = stockStore.deleteStock("target");
    await vi.runAllTimersAsync();
    await deletion;

    expect(deleteRequest).toHaveBeenCalledTimes(3);
    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "last"]);
    expect(stockStore.stats.total_stocks).toBe(11);
    expect(stockStore.error).toBeNull();
  });

  it.each(["server", "network"])(
    "restores the initial snapshot when a retry ends with a %s error",
    async (failure) => {
      deleteRequest.mockResolvedValueOnce(response(429));
      if (failure === "server") {
        deleteRequest.mockResolvedValueOnce(response(500));
      } else {
        deleteRequest.mockRejectedValueOnce(new Error("Connection lost"));
      }

      const deletion = stockStore.deleteStock("target");
      await vi.runAllTimersAsync();
      await deletion;

      expect(deleteRequest).toHaveBeenCalledTimes(2);
      expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
      expect(stockStore.stats.total_stocks).toBe(12);
      expect(stockStore.error).toBe(
        failure === "server" ? "削除に失敗しました" : "Connection lost",
      );
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([false, true])("treats HTTP 404 as success after a retry=%s", async (retry) => {
    if (retry) deleteRequest.mockResolvedValueOnce(response(503));
    deleteRequest.mockResolvedValueOnce(response(404));

    const deletion = stockStore.deleteStock("target");
    await vi.runAllTimersAsync();
    await deletion;

    expect(deleteRequest).toHaveBeenCalledTimes(retry ? 2 : 1);
    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "last"]);
    expect(stockStore.stocks.map((s) => s.id)).toEqual(["first", "last"]);
    expect(stockStore.stats.total_stocks).toBe(11);
    expect(stockStore.error).toBeNull();
  });

  it("preserves unrelated additions, edits, and successful deletions during rollback", async () => {
    deleteRequest.mockImplementation(({ param: { id } }) =>
      Promise.resolve(response(id === "target" ? 503 : 200)),
    );
    const deletion = stockStore.deleteStock("target");
    await vi.advanceTimersByTimeAsync(0);

    const added = makeStock("new");
    stockStore.allStocks = [added, ...stockStore.allStocks];
    stockStore.stats.total_stocks += 1;
    const first = stockStore.allStocks.find((s) => s.id === "first");
    if (!first) throw new Error("Missing fixture");
    first.content = "Edited while deleting";
    await stockStore.deleteStock("last");

    await vi.runAllTimersAsync();
    await deletion;

    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["new", "first", "target"]);
    expect(stockStore.stocks.map((s) => s.id)).toEqual(["new", "first", "target"]);
    expect(stockStore.allStocks.find((s) => s.id === "first")?.content).toBe(
      "Edited while deleting",
    );
    expect(stockStore.stats.total_stocks).toBe(12);
    expect(stockStore.error).toBe("削除に失敗しました");
    expect(deleteRequest.mock.calls.filter(([args]) => args.param.id === "target")).toHaveLength(4);
    expect(deleteRequest.mock.calls.filter(([args]) => args.param.id === "last")).toHaveLength(1);
  });

  it("reapplies the latest search and tag filter when rolling back", async () => {
    seedStocks([
      makeStock("target", "Matching content", ["work"]),
      makeStock("other-tag", "Matching content", ["personal"]),
      makeStock("other-text", "Different content", ["work"]),
    ]);
    deleteRequest.mockResolvedValue(response(503));

    const deletion = stockStore.deleteStock("target");
    stockStore.searchQuery = "matching";
    stockStore.selectedTag = "work";
    await vi.runAllTimersAsync();
    await deletion;

    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["target", "other-tag", "other-text"]);
    expect(stockStore.stocks.map((s) => s.id)).toEqual(["target"]);
    expect(stockStore.stats.total_stocks).toBe(3);
  });

  it("does not duplicate a stock that was restored by another update while pending", async () => {
    deleteRequest.mockResolvedValue(response(503));
    const deletion = stockStore.deleteStock("target");
    const refreshedTarget = makeStock("target", "Refreshed content");
    stockStore.allStocks = [refreshedTarget, ...stockStore.allStocks];

    await vi.runAllTimersAsync();
    await deletion;

    expect(stockStore.allStocks.filter((s) => s.id === "target")).toEqual([refreshedTarget]);
    expect(stockStore.stats.total_stocks).toBe(12);
  });

  it("does not increase a zero total when reverting a clamped optimistic decrement", async () => {
    stockStore.stats.total_stocks = 0;
    deleteRequest.mockResolvedValue(response(500));

    await stockStore.deleteStock("target");

    expect(stockStore.stats.total_stocks).toBe(0);
    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
  });

  it("preserves authoritative stats refreshed while a failed deletion is pending", async () => {
    deleteRequest.mockResolvedValue(response(503));
    statsRequest.mockResolvedValue(
      Response.json({ score: 50, total_stocks: 15, current_streak: 3, rediscovery_count: 2 }),
    );

    const deletion = stockStore.deleteStock("target");
    await stockStore.fetchStats();
    await vi.runAllTimersAsync();
    await deletion;

    expect(stockStore.allStocks.map((s) => s.id)).toEqual(["first", "target", "last"]);
    expect(stockStore.stats).toEqual({
      score: 50,
      total_stocks: 15,
      streak: 3,
      rediscovery_count: 2,
    });
  });
});
