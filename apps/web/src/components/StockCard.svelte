<script lang="ts">
  import { Trash2, Clock, Sparkles, MessageSquareQuote } from "lucide-svelte";
  import type { StockItem } from "../types/stock";
  import { formatTime } from "../utils/date";

  interface Props {
    stock: StockItem;
    onDelete?: (id: string) => void;
  }

  let { stock, onDelete }: Props = $props();

  let formattedTime = $derived(formatTime(stock.created_at));

  // 新規投稿直後（1分以内）で AI コメントがまだない場合は「考え中」を表示
  let isThinking = $derived.by(() => {
    if (stock.ai_comment) return false;
    const createdAt = new Date(stock.created_at).getTime();
    const now = Date.now();
    return now - createdAt < 30 * 1000; // 30秒以内
  });
</script>

<article class="bg-white rounded-2xl p-4.5 shadow-xs border border-slate-200/70 hover:border-slate-300 transition-all group overflow-hidden">
  <!-- ヘッダー: 時刻 & 削除アクション -->
  <div class="flex items-center justify-between text-xs text-slate-400 mb-2.5">
    <div class="flex items-center gap-1.5 font-medium">
      <Clock class="w-3.5 h-3.5 text-slate-400" />
      <time datetime={stock.created_at}>{formattedTime}</time>
    </div>

    {#if onDelete}
      <button
        type="button"
        onclick={() => onDelete(stock.id)}
        aria-label="ストックを削除"
        class="opacity-60 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-md transition-all text-slate-400"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  <!-- 本文 -->
  <p class="text-slate-800 text-[15px] leading-relaxed whitespace-pre-wrap break-words font-normal">
    {stock.content}
  </p>

  <!-- AI パートナーからの問いかけ領域 -->
  {#if stock.ai_comment}
    <div class="mt-3.5 pt-3 bg-gradient-to-br from-teal-50/90 to-emerald-50/60 -mx-4.5 -mb-4.5 p-3.5 rounded-b-2xl border-t border-teal-100/70">
      <div class="flex items-center gap-1.5 text-teal-800 text-xs font-bold mb-1.5">
        <div class="w-4.5 h-4.5 rounded-full bg-teal-600/10 text-teal-700 flex items-center justify-center">
          <Sparkles class="w-3 h-3 text-teal-600 fill-teal-600/30" />
        </div>
        <span>AI パートナーからの問いかけ</span>
      </div>
      <p class="text-[13px] text-slate-700 leading-relaxed pl-6">
        {stock.ai_comment}
      </p>
    </div>
  {:else if isThinking}
    <!-- 生成中パルスアニメーション -->
    <div class="mt-3.5 pt-2.5 bg-slate-50/80 -mx-4.5 -mb-4.5 p-3 rounded-b-2xl border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 animate-pulse">
      <MessageSquareQuote class="w-3.5 h-3.5 text-teal-500" />
      <span>AI パートナーが問いかけを考えています...</span>
    </div>
  {/if}
</article>
