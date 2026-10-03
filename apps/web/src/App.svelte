<script lang="ts">
  import Header from "./components/Header.svelte";
  import Timeline from "./components/Timeline.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import StockInputModal from "./components/StockInputModal.svelte";
  import type { StockItem } from "./components/StockCard.svelte";
  import { Flame, Trophy, Calendar, Sparkles } from "lucide-svelte";

  // タブ状態
  let currentTab = $state<"timeline" | "stats">("timeline");

  // モーダル開閉状態
  let isModalOpen = $state(false);
  let isSubmitting = $state(false);

  // 初期ストックデータ（プロトタイプ検証用）
  let stocks = $state<StockItem[]>([
    {
      id: "stock-1",
      content: "【YWT】\nやったこと: Vite+ と Cloudflare D1 のローカル開発環境を構築した。\nわかったこと: Vite+ (vp) の内包ツールチェーンが高速で、Vitest も組み込みで動く。\n次にやること: Svelte 5 の Runes で UI コンポーネントを組み上げる！",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_comment: "素晴らしい進捗ですね！ツールチェーンを統一したことで、今後の開発スピードにどのような良い影響がありそうですか？",
    },
    {
      id: "stock-2",
      content: "設計ドキュメントをしっかり書いてから実装に入ると、手戻りが極端に少なくなることを実感。Documentation First の原則は守り続けたい。",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "stock-3",
      content: "作業中に集中が途切れた時、ポモドーロタイマー（25分集中＋5分休憩）を試したら想像以上にリズムが保てた。明日も実践してみる。",
      created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  // ユーザー統計情報
  let stats = $state({
    score: 30,
    totalStocks: 3,
    streak: 2,
    rediscoveryCount: 0,
  });

  // ストック追加
  async function handleAddStock(content: string) {
    isSubmitting = true;
    try {
      // 疑似遅延 (保存演出)
      await new Promise((resolve) => setTimeout(resolve, 300));

      const newStock: StockItem = {
        id: "stock-" + Date.now(),
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      stocks = [newStock, ...stocks];
      stats.totalStocks += 1;
      stats.score += 10;
    } finally {
      isSubmitting = false;
    }
  }

  // ストック削除
  function handleDeleteStock(id: string) {
    stocks = stocks.filter((s) => s.id !== id);
    stats.totalStocks = Math.max(0, stats.totalStocks - 1);
  }
</script>

<div class="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-teal-500/20 selection:text-teal-900">
  <div class="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50/50 shadow-xs border-x border-slate-200/60 relative">
    <!-- ヘッダー -->
    <Header streak={stats.streak} totalStocks={stats.totalStocks} />

    <!-- メインコンテンツ領域 -->
    <main class="flex-1">
      {#if currentTab === "timeline"}
        <!-- タイムライン表示 -->
        <Timeline {stocks} onDeleteStock={handleDeleteStock} />
      {:else}
        <!-- ふりかえり・統計タブ表示 -->
        <div class="p-4 space-y-4 pb-28">
          <div class="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-6 text-white shadow-lg shadow-teal-700/20">
            <span class="text-xs font-semibold text-teal-200 tracking-wider">REFLECTIVE LEVEL</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-4xl font-extrabold tracking-tight">{stats.score}</span>
              <span class="text-teal-200 text-sm">ポイント</span>
            </div>
            <p class="text-xs text-teal-100/90 mt-3 leading-relaxed">
              内省をストックするたびにスコアが蓄積され、あなたの内省習慣が可視化されます。
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div class="flex items-center gap-2 text-amber-500 mb-1">
                <Flame class="w-4 h-4 fill-amber-500" />
                <span class="text-xs font-bold text-slate-600">連続ストリーク</span>
              </div>
              <p class="text-2xl font-extrabold text-slate-900">{stats.streak} <span class="text-xs font-normal text-slate-500">日連続</span></p>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div class="flex items-center gap-2 text-teal-600 mb-1">
                <Trophy class="w-4 h-4" />
                <span class="text-xs font-bold text-slate-600">累計ストック</span>
              </div>
              <p class="text-2xl font-extrabold text-slate-900">{stats.totalStocks} <span class="text-xs font-normal text-slate-500">件</span></p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div class="flex items-center gap-2 text-teal-700 font-bold text-sm">
              <Sparkles class="w-4 h-4" />
              <h3>AI との過去の再発見</h3>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed">
              過去のストックが蓄積されると、Milestone 2 にて AI が「1週間前や1ヶ月前の学び」を自動的にリコメンドし、長期的な成長サイクルを促します。
            </p>
          </div>
        </div>
      {/if}
    </main>

    <!-- ボトムナビゲーション -->
    <BottomNav
      {currentTab}
      onTabChange={(tab) => (currentTab = tab)}
      onOpenModal={() => (isModalOpen = true)}
    />

    <!-- 内省投稿モーダル -->
    <StockInputModal
      isOpen={isModalOpen}
      {isSubmitting}
      onClose={() => (isModalOpen = false)}
      onSubmit={handleAddStock}
    />
  </div>
</div>
