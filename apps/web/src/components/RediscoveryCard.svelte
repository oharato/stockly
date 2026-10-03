<script lang="ts">
  import { Zap, Check, Sparkles, MessageSquareQuote } from "lucide-svelte";
  import type { StockItem } from "../types/stock";
  import { formatGroupTitle, getDateKey } from "../utils/date";

  interface Props {
    stock: StockItem;
    onRead: () => Promise<void>;
    isRead?: boolean;
  }

  let { stock, onRead, isRead = false }: Props = $props();

  let isReading = $state(false);
  let localRead = $state(isRead);

  let formattedDate = $derived(formatGroupTitle(getDateKey(stock.created_at)));

  async function handleRead() {
    if (localRead || isReading) return;
    isReading = true;
    try {
      await onRead();
      localRead = true;
    } finally {
      isReading = false;
    }
  }
</script>

<div class="bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-orange-400/10 border border-amber-300/60 rounded-3xl p-4.5 shadow-xs relative overflow-hidden">
  <!-- 装飾の背景グラデーションサークル -->
  <div class="absolute -right-6 -top-6 w-24 h-24 bg-amber-400/15 rounded-full blur-xl pointer-events-none"></div>

  <!-- ヘッダー行 -->
  <div class="flex items-center justify-between gap-2 mb-2.5">
    <div class="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
      <div class="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
        <Zap class="w-3 h-3 fill-current" />
      </div>
      <span>今日の再発見</span>
      <span class="text-[11px] font-normal text-amber-600/90 ml-1">({formattedDate})</span>
    </div>

    <!-- 読了アクションボタン -->
    {#if localRead}
      <div class="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
        <Check class="w-3 h-3 stroke-2" />
        <span>振り返り済み</span>
      </div>
    {:else}
      <button
        type="button"
        onclick={handleRead}
        disabled={isReading}
        class="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all px-3 py-1 rounded-full shadow-xs cursor-pointer disabled:opacity-50"
      >
        <span>振り返った</span>
        <span class="text-[10px] bg-amber-700/60 px-1 py-0.2 rounded-full">+20pt</span>
      </button>
    {/if}
  </div>

  <!-- ストック本文プレビュー -->
  <p class="text-slate-800 text-[14px] leading-relaxed whitespace-pre-wrap break-words font-medium">
    {stock.content}
  </p>

  <!-- AI コメントがある場合 -->
  {#if stock.ai_comment}
    <div class="mt-3 pt-2.5 border-t border-amber-200/60 flex items-start gap-2 text-xs text-amber-900/80">
      <Sparkles class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
      <span class="leading-relaxed">{stock.ai_comment}</span>
    </div>
  {/if}
</div>
