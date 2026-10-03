<script lang="ts">
  import Header from "./components/Header.svelte";
  import Timeline from "./components/Timeline.svelte";
  import SearchBar from "./components/SearchBar.svelte";
  import RediscoveryCard from "./components/RediscoveryCard.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import StockInputModal from "./components/StockInputModal.svelte";
  import { stockStore } from "./lib/stocks.svelte";
  import { Flame, Trophy, Sparkles, Loader2, AlertCircle } from "lucide-svelte";

  // タブ状態
  let currentTab = $state<"timeline" | "stats">("timeline");

  // モーダル開閉状態
  let isModalOpen = $state(false);

  // マウント時に API から実データを取得
  $effect(() => {
    stockStore.fetchStocks();
    stockStore.fetchStats();
    stockStore.fetchRediscovery();
  });

  // ストック追加ハンドラー
  async function handleAddStock(content: string, imageFile?: File | null) {
    let imageKeys: string[] | undefined;
    if (imageFile) {
      const key = await stockStore.uploadImage(imageFile);
      imageKeys = [key];
    }
    await stockStore.createStock(content, imageKeys);
  }

  // ストック削除ハンドラー
  async function handleDeleteStock(id: string) {
    if (confirm("このストックを削除しますか？")) {
      await stockStore.deleteStock(id);
    }
  }
</script>

<div class="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-teal-500/20 selection:text-teal-900">
  <div class="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50/50 shadow-xs border-x border-slate-200/60 relative">
    <!-- ヘッダー -->
    <Header streak={stockStore.stats.streak} totalStocks={stockStore.stats.total_stocks} />

    <!-- エラーバナー (ある場合) -->
    {#if stockStore.error}
      <div class="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0 text-rose-500" />
        <span class="flex-1">{stockStore.error}</span>
      </div>
    {/if}

    <!-- メインコンテンツ領域 -->
    <main class="flex-1">
      {#if currentTab === "timeline"}
        <div class="px-4 pt-3.5 pb-28 space-y-4">
          <!-- 検索バー -->
          <SearchBar
            value={stockStore.searchQuery}
            onInput={(val) => stockStore.setSearchQuery(val)}
            onClear={() => stockStore.clearSearch()}
          />

          <!-- 今日の再発見カード (検索中でなく、再発見ストックがある場合に表示) -->
          {#if !stockStore.searchQuery && stockStore.rediscovery}
            <RediscoveryCard
              stock={stockStore.rediscovery}
              isRead={stockStore.isRediscoveryRead}
              onRead={() => stockStore.readRediscovery()}
            />
          {/if}

          <!-- タイムライン表示 -->
          {#if stockStore.isLoading && stockStore.stocks.length === 0}
            <div class="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 class="w-6 h-6 animate-spin text-teal-600" />
              <span class="text-xs">ストックを読み込み中...</span>
            </div>
          {:else}
            <Timeline
              stocks={stockStore.stocks}
              searchQuery={stockStore.searchQuery}
              onDeleteStock={handleDeleteStock}
              onClearSearch={() => stockStore.clearSearch()}
            />
          {/if}
        </div>
      {:else}
        <!-- ふりかえり・統計タブ表示 -->
        <div class="p-4 space-y-4 pb-28">
          <div class="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-6 text-white shadow-lg shadow-teal-700/20">
            <span class="text-xs font-semibold text-teal-200 tracking-wider">REFLECTIVE LEVEL</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-4xl font-extrabold tracking-tight">{stockStore.stats.score}</span>
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
              <p class="text-2xl font-extrabold text-slate-900">{stockStore.stats.streak} <span class="text-xs font-normal text-slate-500">日連続</span></p>
            </div>

            <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div class="flex items-center gap-2 text-teal-600 mb-1">
                <Trophy class="w-4 h-4" />
                <span class="text-xs font-bold text-slate-600">累計ストック</span>
              </div>
              <p class="text-2xl font-extrabold text-slate-900">{stockStore.stats.total_stocks} <span class="text-xs font-normal text-slate-500">件</span></p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div class="flex items-center gap-2 text-teal-700 font-bold text-sm">
              <Sparkles class="w-4 h-4" />
              <h3>AI との過去の再発見</h3>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed">
              日々の内省を積み重ねることで、AI が過去のストックから「過去の気づき」を再提示し、忘れかけていた学びと現在の思考を結びつけます。
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
      isSubmitting={stockStore.isSubmitting}
      onClose={() => (isModalOpen = false)}
      onSubmit={handleAddStock}
    />
  </div>
</div>
