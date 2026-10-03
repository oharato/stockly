import { client } from "./api";
import type { StockItem, GoalItem, TagItem, UserStats } from "../types/stock";

class StockStore {
  stocks = $state<StockItem[]>([]);
  tags = $state<TagItem[]>([]);
  goals = $state<GoalItem[]>([]);
  selectedTag = $state<string | null>(null);

  stats = $state<UserStats>({
    score: 0,
    total_stocks: 0,
    streak: 0,
    rediscovery_count: 0,
  });
  isLoading = $state(false);
  isSubmitting = $state(false);
  error = $state<string | null>(null);
  isAuthError = $state(false);

  private handleError(err: unknown, defaultMsg: string) {
    const rawMsg = err instanceof Error ? err.message : defaultMsg;
    if (
      typeof window !== "undefined" &&
      window.navigator.onLine &&
      (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError"))
    ) {
      this.isAuthError = true;
      this.error =
        "認証セッションが切れたか、保護されています。再読み込みしてログインしてください。";
    } else if (typeof window !== "undefined" && !window.navigator.onLine) {
      this.isAuthError = false;
      this.error = "オフラインです。インターネット接続を確認してください。";
    } else {
      this.isAuthError = false;
      this.error = rawMsg;
    }
  }

  searchQuery = $state("");
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  rediscovery = $state<StockItem | null>(null);
  isRediscoveryRead = $state(false);

  // 一覧取得（検索クエリ & タグフィルター対応）
  async fetchStocks(silent = false, query?: string, tag?: string | null) {
    if (!silent) {
      this.isLoading = true;
    }
    this.error = null;
    this.isAuthError = false;
    const q = query !== undefined ? query : this.searchQuery;
    const t = tag !== undefined ? tag : this.selectedTag;
    try {
      const queryParams: Record<string, string> = {};
      if (q) queryParams.q = q;
      if (t) queryParams.tag = t;

      const res = await client.api.stocks.$get({
        query: queryParams,
      });
      if (!res.ok) throw new Error("ストックの取得に失敗しました");
      const data = await res.json();
      this.stocks = data.stocks as StockItem[];
    } catch (err: unknown) {
      this.handleError(err, "エラーが発生しました");
    } finally {
      if (!silent) {
        this.isLoading = false;
      }
    }
  }

  // タグ選択フィルター
  selectTag(tag: string | null) {
    this.selectedTag = tag;
    void this.fetchStocks(true);
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

  // 画像アップロード
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = (await res.json()) as { error?: string };
      throw new Error(errData.error || "画像のアップロードに失敗しました");
    }

    const data = (await res.json()) as { key: string; url: string };
    return data.key;
  }

  // 使用中タグ一覧取得
  async fetchTags() {
    try {
      const res = await client.api.tags.$get();
      if (!res.ok) return;
      const data = await res.json();
      this.tags = data.tags;
    } catch {
      // サイレントに処理
    }
  }

  // 目標一覧取得
  async fetchGoals() {
    try {
      const res = await client.api.goals.$get();
      if (!res.ok) return;
      const data = await res.json();
      this.goals = data.goals as GoalItem[];
    } catch {
      // サイレントに処理
    }
  }

  // 目標新規作成
  async createGoal(title: string, category = "general", color = "teal") {
    try {
      const res = await client.api.goals.$post({
        json: { title, category, color },
      });
      if (!res.ok) throw new Error("目標の作成に失敗しました");
      const created = (await res.json()) as GoalItem;
      this.goals = [...this.goals, created];
      return created;
    } catch (err: unknown) {
      this.handleError(err, "目標作成エラー");
      throw err;
    }
  }

  // 目標削除
  async deleteGoal(id: string) {
    try {
      const res = await client.api.goals[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("目標の削除に失敗しました");
      this.goals = this.goals.filter((g) => g.id !== id);
    } catch (err: unknown) {
      this.handleError(err, "目標削除エラー");
    }
  }

  // 新規ストック作成
  async createStock(content: string, imageKeys?: string[], tagNames?: string[]) {
    this.isSubmitting = true;
    this.error = null;
    this.isAuthError = false;
    try {
      const res = await client.api.stocks.$post({
        json: { content, imageKeys, tagNames },
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

      // サーバーから最新の統計（streak等）およびタグ一覧・目標を再取得
      void this.fetchStats();
      void this.fetchTags();
      void this.fetchGoals();

      // 非同期のAIコメント生成完了を待ってバックグラウンドで再取得（1.5秒後 & 3.5秒後）
      setTimeout(() => {
        void this.fetchStocks(true);
      }, 1500);
      setTimeout(() => {
        void this.fetchStocks(true);
      }, 3500);
    } catch (err: unknown) {
      this.handleError(err, "エラーが発生しました");
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
      this.handleError(err, "削除エラーが発生しました");
    }
  }
}

export const stockStore = new StockStore();
