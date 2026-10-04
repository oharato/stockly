<script lang="ts">
  import { onMount } from "svelte";
  import Header from "./components/Header.svelte";
  import Timeline from "./components/Timeline.svelte";
  import SearchBar from "./components/SearchBar.svelte";
  import TagFilterBar from "./components/TagFilterBar.svelte";
  import RediscoveryCard from "./components/RediscoveryCard.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import StockInputModal from "./components/StockInputModal.svelte";
  import StatsReport from "./components/StatsReport.svelte";
  import { stockStore } from "./lib/stocks.svelte";
  import { forceClearCacheAndReload } from "./lib/cache-utils";
  import { Flame, Trophy, Sparkles, Loader2, AlertCircle } from "lucide-svelte";

  // タブ状態
  let currentTab = $state<"timeline" | "stats">("timeline");

  // モーダル開閉状態
  let isModalOpen = $state(false);

  // マウント時に一度だけ API から初期データを取得
  onMount(() => {
    stockStore.fetchStocks();
    stockStore.fetchStats();
    stockStore.fetchRediscovery();
    stockStore.fetchTags();
    stockStore.fetchGoals();
  });

  // ストック追加ハンドラー
  async function handleAddStock(content: string, imageFile?: File | null, tagNames?: string[]) {
    let imageKeys: string[] | undefined;
    if (imageFile) {
      const key = await stockStore.uploadImage(imageFile);
      imageKeys = [key];
    }
    await stockStore.createStock(content, imageKeys, tagNames);
  }

  // ストック削除ハンドラー
  async function handleDeleteStock(id: string) {
    console.log("[handleDeleteStock] Triggered for id:", id);
    if (confirm("このストックを削除しますか？")) {
      console.log("[handleDeleteStock] Confirmed, calling deleteStock:", id);
      await stockStore.deleteStock(id);
    } else {
      console.log("[handleDeleteStock] Cancelled confirm dialog");
    }
  }

  // 目標作成ハンドラー
  async function handleCreateGoal(title: string, category?: string, color?: string) {
    await stockStore.createGoal(title, category, color);
  }

  // 目標削除ハンドラー
  async function handleDeleteGoal(id: string) {
    if (confirm("この目標を削除しますか？")) {
      await stockStore.deleteGoal(id);
    }
  }
</script>

<div class="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-teal-500/20 selection:text-teal-900">
  <div class="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50/50 shadow-xs border-x border-slate-200/60 relative">
    <!-- ヘッダー -->
    <Header streak={stockStore.stats.streak} totalStocks={stockStore.stats.total_stocks} />

    <!-- エラーバナー (ある場合) -->
    {#if stockStore.error}
      <div class="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between gap-2 shadow-2xs">
        <div class="flex items-center gap-2 flex-1">
          <AlertCircle class="w-4 h-4 shrink-0 text-rose-500" />
          <span class="flex-1 leading-relaxed">{stockStore.error}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            onclick={forceClearCacheAndReload}
            class="px-2 py-1 bg-white hover:bg-slate-50 border border-rose-300 text-rose-700 font-medium text-[11px] rounded-lg transition"
            title="PWAキャッシュを消去して最新版を取得"
          >
            更新
          </button>
          {#if stockStore.isAuthError}
            <button
              onclick={() => {
                window.location.href = "/api/auth/login";
              }}
              class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] rounded-lg transition"
            >
              ログイン
            </button>
          {/if}
        </div>
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

          <!-- タグフィルターバー -->
          <TagFilterBar
            tags={stockStore.tags}
            selectedTag={stockStore.selectedTag}
            onSelectTag={(tag) => stockStore.selectTag(tag)}
          />

          <!-- 今日の再発見カード (検索中でなく、タグ未選択で、再発見ストックがある場合に表示) -->
          {#if !stockStore.searchQuery && !stockStore.selectedTag && stockStore.rediscovery}
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
              selectedTag={stockStore.selectedTag}
              onDeleteStock={handleDeleteStock}
              onClearSearch={() => stockStore.clearSearch()}
              onClearTag={() => stockStore.selectTag(null)}
            />
          {/if}
        </div>
      {:else}
        <!-- ふりかえり・統計レポートタブ表示 -->
        <div class="px-4 pt-3.5">
          <StatsReport
            stats={stockStore.stats}
            stocks={stockStore.stocks}
            tags={stockStore.tags}
            goals={stockStore.goals}
            onCreateGoal={handleCreateGoal}
            onDeleteGoal={handleDeleteGoal}
          />
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
      availableTags={stockStore.tags}
      availableGoals={stockStore.goals}
      onClose={() => (isModalOpen = false)}
      onSubmit={handleAddStock}
    />
  </div>
</div>
