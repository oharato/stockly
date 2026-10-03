<script lang="ts">
  import StockCard from "./StockCard.svelte";
  import type { StockItem } from "../types/stock";
  import { getDateKey, formatGroupTitle } from "../utils/date";
  import { Sparkles, Calendar } from "lucide-svelte";

  interface Props {
    stocks: StockItem[];
    searchQuery?: string;
    selectedTag?: string | null;
    onDeleteStock?: (id: string) => void;
    onClearSearch?: () => void;
    onClearTag?: () => void;
  }

  let {
    stocks = [],
    searchQuery = "",
    selectedTag = null,
    onDeleteStock,
    onClearSearch,
    onClearTag,
  }: Props = $props();

  // 日付ごとにグループ化
  let groupedStocks = $derived.by(() => {
    const groups: { dateKey: string; title: string; items: StockItem[] }[] = [];
    const map = new Map<string, StockItem[]>();

    for (const stock of stocks) {
      const key = getDateKey(stock.created_at);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(stock);
    }

    for (const [key, items] of map.entries()) {
      groups.push({
        dateKey: key,
        title: formatGroupTitle(key),
        items,
      });
    }

    return groups;
  });
</script>

<div class="space-y-6">
  {#if stocks.length === 0}
    {#if searchQuery || selectedTag}
      <!-- 検索・絞り込み結果 0 件 -->
      <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
          <Calendar class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-bold text-slate-700 mb-1">見つかりませんでした</h3>
        <p class="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
          {#if searchQuery && selectedTag}
            「#{selectedTag}」かつ「{searchQuery}」に一致するストックはありません。
          {:else if selectedTag}
            「#{selectedTag}」のストックはありません。
          {:else}
            「{searchQuery}」に一致するストックはありません。
          {/if}
        </p>
        <div class="flex items-center gap-2">
          {#if searchQuery && onClearSearch}
            <button
              type="button"
              onclick={onClearSearch}
              class="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200/80 px-3.5 py-1.5 rounded-full hover:bg-teal-100 transition-colors"
            >
              検索条件をクリア
            </button>
          {/if}
          {#if selectedTag && onClearTag}
            <button
              type="button"
              onclick={onClearTag}
              class="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
            >
              タグ絞り込みを解除
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <!-- 初期空状態（Empty State） -->
      <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div class="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4 shadow-xs">
          <Sparkles class="w-8 h-8" />
        </div>
        <h3 class="text-base font-bold text-slate-800 mb-1">日々の学びをストックしよう</h3>
        <p class="text-xs text-slate-500 max-w-xs leading-relaxed mb-6">
          今日感じたこと、反省、次に試したいことを自由に書き留めてみましょう。AI パートナーがあなたの思考を整理します。
        </p>
        <div class="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50/80 border border-teal-200/80 px-3.5 py-1.5 rounded-full">
          <span>下の「＋」ボタンから投稿</span>
        </div>
      </div>
    {/if}
  {:else}
    <!-- グループ化されたタイムライン -->
    {#each groupedStocks as group (group.dateKey)}
      <section class="space-y-3">
        <!-- 日付見出し -->
        <div class="flex items-center gap-1.5 sticky top-14 z-20 bg-slate-50/90 backdrop-blur-xs py-1 text-xs font-bold text-slate-500 tracking-wide">
          <Calendar class="w-3.5 h-3.5 text-slate-400" />
          <h2>{group.title}</h2>
          <span class="text-[10px] text-slate-400 font-normal ml-auto">{group.items.length}件</span>
        </div>

        <!-- カード一覧 -->
        <div class="space-y-3">
          {#each group.items as stock (stock.id)}
            <StockCard {stock} onDelete={onDeleteStock} />
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>
