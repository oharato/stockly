import { client } from "./api";
import type { StockItem, UserStats } from "../types/stock";

class StockStore {
  stocks = $state<StockItem[]>([]);
  stats = $state<UserStats>({
    score: 0,
    total_stocks: 0,
    streak: 0,
    rediscovery_count: 0,
  });
  isLoading = $state(false);
  isSubmitting = $state(false);
  error = $state<string | null>(null);

  searchQuery = $state("");
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  rediscovery = $state<StockItem | null>(null);
  isRediscoveryRead = $state(false);

  // 一覧取得
  async fetchStocks(silent = false, query?: string) {
    if (!silent) {
      this.isLoading = true;
    }
    this.error = null;
    const q = query !== undefined ? query : this.searchQuery;
    try {
      const res = await client.api.stocks.$get({
        query: q ? { q } : {},
      });
      if (!res.ok) throw new Error("ストックの取得に失敗しました");
      const data = await res.json();
      this.stocks = data.stocks as StockItem[];
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : "エラーが発生しました";
    } finally {
      if (!silent) {
        this.isLoading = false;
      }
    }
  }

  // 検索クエリ更新（250ms デバウンス付きインクリメンタル検索）
  setSearchQuery(q: string) {
    this.searchQuery = q;
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      void this.fetchStocks(true, q);
    }, 250);
  }

  // 検索クリア
  clearSearch() {
    this.searchQuery = "";
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    void this.fetchStocks(true, "");
  }

  // 統計情報取得
  async fetchStats() {
    try {
      const res = await client.api.stats.$get();
      if (!res.ok) return;
      const data = await res.json();
      this.stats = {
        score: data.score,
        total_stocks: data.total_stocks,
        streak: data.current_streak,
        rediscovery_count: data.rediscovery_count,
      };
    } catch {
      // 統計エラーはサイレントに処理
    }
  }

  // 今日の再発見を取得
  async fetchRediscovery() {
    try {
      const res = await client.api.stocks.rediscovery.$get();
      if (!res.ok) return;
      const data = await res.json();
      this.rediscovery = (data.rediscovery as StockItem) ?? null;
    } catch {
      // サイレントに処理
    }
  }

  // 再発見を読了記録 (+20pt, +1 rediscovery_count)
  async readRediscovery() {
    try {
      const res = await client.api.stocks.rediscovery.read.$post();
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.stats) {
        this.stats.score = data.stats.score;
        this.stats.rediscovery_count = data.stats.rediscovery_count;
        this.isRediscoveryRead = true;
      }
    } catch {
      // サイレントに処理
    }
  }

  // 新規ストック作成
  async createStock(content: string) {
    this.isSubmitting = true;
    this.error = null;
    try {
      const res = await client.api.stocks.$post({
        json: { content },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error((errorData as { message?: string }).message || "作成に失敗しました");
      }
      const newStock = (await res.json()) as StockItem;
      // 先頭に追加
      this.stocks = [newStock, ...this.stocks];
      this.stats.total_stocks += 1;
      this.stats.score += 10;

      // サーバーから最新の統計（streak等）を取得
      void this.fetchStats();

      // 非同期のAIコメント生成完了を待ってバックグラウンドで再取得（1.5秒後 & 3.5秒後）
      setTimeout(() => {
        void this.fetchStocks(true);
      }, 1500);
      setTimeout(() => {
        void this.fetchStocks(true);
      }, 3500);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : "エラーが発生しました";
      throw err;
    } finally {
      this.isSubmitting = false;
    }
  }

  // ストック削除
  async deleteStock(id: string) {
    try {
      const res = await client.api.stocks[":id"].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      // ローカル配列から除外
      this.stocks = this.stocks.filter((s) => s.id !== id);
      this.stats.total_stocks = Math.max(0, this.stats.total_stocks - 1);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : "削除エラーが発生しました";
    }
  }
}

export const stockStore = new StockStore();
