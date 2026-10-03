<script lang="ts">
  import { Trash2, Clock, Sparkles } from "lucide-svelte";

  export interface StockItem {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
    ai_comment?: string | null;
  }

  interface Props {
    stock: StockItem;
    onDelete?: (id: string) => void;
  }

  let { stock, onDelete }: Props = $props();

  // 時刻フォーマット (例: "14:30")
  let formattedTime = $derived.by(() => {
    try {
      const date = new Date(stock.created_at);
      return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  });
</script>

<article class="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/70 hover:border-slate-300 transition-all group">
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

  <!-- AI コメント領域 (存在する場合) -->
  {#if stock.ai_comment}
    <div class="mt-3 pt-3 border-t border-slate-100 bg-teal-50/50 -mx-4 -mb-4 p-3 rounded-b-2xl border-t border-teal-100/60">
      <div class="flex items-center gap-1.5 text-teal-700 text-xs font-semibold mb-1">
        <Sparkles class="w-3.5 h-3.5 text-teal-600" />
        <span>AI パートナーからの問い</span>
      </div>
      <p class="text-xs text-slate-600 leading-relaxed pl-5">
        {stock.ai_comment}
      </p>
    </div>
  {/if}
</article>
