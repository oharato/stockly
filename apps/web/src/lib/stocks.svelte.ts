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

  allStocks = $state<StockItem[]>([]);
  searchQuery = $state("");
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private searchAbortController: AbortController | null = null;

  rediscovery = $state<StockItem | null>(null);
  isRediscoveryRead = $state(false);

  // ローカルキャッシュに基づく即時フィルタリング (0ms 反映)
  private applyLocalFilter() {
    if (this.allStocks.length === 0) return;

    const q = this.searchQuery.trim().toLowerCase();
    const t = this.selectedTag;

    let filtered = this.allStocks;

    if (t) {
      filtered = filtered.filter((s) => s.tags && s.tags.includes(t));
    }

    if (q) {
      filtered = filtered.filter((s) => s.content.toLowerCase().includes(q));
    }

    this.stocks = filtered;
  }

  // 一覧取得（検索クエリ & タグフィルター対応）
  async fetchStocks(
    silent = false,
    query?: string,
    tag?: string | null,
    retryCount = 0,
  ): Promise<void> {
    if (!silent) {
      this.isLoading = true;
    }
    this.error = null;
    this.isAuthError = false;

    // 前回の保留中のリクエストをキャンセル
    if (this.searchAbortController) {
      this.searchAbortController.abort();
    }
    this.searchAbortController = new AbortController();
    const signal = this.searchAbortController.signal;

    const q = query !== undefined ? query : this.searchQuery;
    const t = tag !== undefined ? tag : this.selectedTag;

    // まずローカルキャッシュから即座に画面を更新 (体感 0ms)
    this.applyLocalFilter();

    try {
      const queryParams: Record<string, string> = {};
      if (q && q.trim()) queryParams.q = q.trim();
      if (t && t.trim()) queryParams.tag = t.trim();

      const res = await client.api.stocks.$get(
        {
          query: queryParams,
        },
        {
          init: { signal },
        },
      );

      if (!res.ok) {
        const status = res.status;
        let detailMsg = `ストックの取得に失敗しました (HTTP ${status})`;
        try {
          const errData = (await res.json()) as { error?: string; details?: string };
          if (errData.details) detailMsg += `: ${errData.details}`;
          else if (errData.error) detailMsg += `: ${errData.error}`;
        } catch {
          try {
            const raw = await res.text();
            if (raw) detailMsg += `: ${raw.slice(0, 100)}`;
          } catch {}
        }

        // 429 (Rate Limit) や 503 時の耐障害性
        if (status === 429 || status === 503) {
          // すでにローカルキャッシュがある場合はエラーバナーを出さずローカル結果を維持
          if (this.allStocks.length > 0) {
            console.warn("Server search throttled, using local cached results:", status);
            this.applyLocalFilter();
            return;
          }
          // 初回ロードでキャッシュがない場合は1.2秒待って自動リトライ (最大2回)
          if (retryCount < 2) {
            console.warn(
              `[429 Throttled] Retrying initial load in 1.2s (attempt ${retryCount + 1}/2)...`,
            );
            await new Promise((r) => setTimeout(r, 1200));
            return await this.fetchStocks(silent, query, tag, retryCount + 1);
          }
        }

        console.error("fetchStocks API error:", status, detailMsg);
        throw new Error(detailMsg);
      }

      const data = await res.json();
      const serverStocks = data.stocks as StockItem[];

      // クエリやタグがない全件取得の場合はマスターキャッシュを更新
      if (!q && !t) {
        this.allStocks = serverStocks;
        this.applyLocalFilter();
      } else {
        this.stocks = serverStocks;
      }
    } catch (err: unknown) {
      // ユーザーの入力継続によるリクエスト中断はエラー扱いしない
      if (
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return;
      }

      // ローカルキャッシュがあれば画面を維持
      if (this.allStocks.length > 0 && (q || t)) {
        console.warn("Search request failed, falling back to local filter:", err);
        this.applyLocalFilter();
        return;
      }

      this.handleError(err, "エラーが発生しました");
    } finally {
      if (!silent) {
        this.isLoading = false;
      }
    }
  }

  // タグ選択フィルター (即時ローカル反映 + サーバー同期)
  selectTag(tag: string | null) {
    this.selectedTag = tag;
    this.applyLocalFilter();
    void this.fetchStocks(true);
  }

  // 検索クエリ更新（即時ローカル反映 + 350ms デバウンス付きサーバー同期）
  setSearchQuery(q: string) {
    this.searchQuery = q;
    // キー入力と同時に 0ms でローカル結果を表示！
    this.applyLocalFilter();

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      void this.fetchStocks(true, q);
    }, 350);
  }

  // 検索クリア (即時ローカル反映)
  clearSearch() {
    this.searchQuery = "";
    this.applyLocalFilter();
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
      // マスターキャッシュおよび表示用リストを即時更新
      this.allStocks = [newStock, ...this.allStocks];
      this.applyLocalFilter();
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
      // ローカル配列およびマスターキャッシュから除外
      this.allStocks = this.allStocks.filter((s) => s.id !== id);
      this.applyLocalFilter();
      this.stats.total_stocks = Math.max(0, this.stats.total_stocks - 1);
    } catch (err: unknown) {
      this.handleError(err, "削除エラーが発生しました");
    }
  }
}

export const stockStore = new StockStore();
