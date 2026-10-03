<script lang="ts">
  import StockCard, { type StockItem } from "./StockCard.svelte";
  import { Sparkles, Calendar } from "lucide-svelte";

  interface Props {
    stocks: StockItem[];
    onDeleteStock?: (id: string) => void;
  }

  let { stocks = [], onDeleteStock }: Props = $props();

  // 日付ラベルの整形関数
  function getDateKey(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return "その他";
    }
  }

  function formatGroupTitle(dateKey: string): string {
    if (dateKey === "その他") return dateKey;
    const now = new Date();
    const todayKey = getDateKey(now.toISOString());
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = getDateKey(yesterday.toISOString());

    const [year, month, day] = dateKey.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const dayOfWeek = days[dateObj.getDay()];

    let prefix = "";
    if (dateKey === todayKey) prefix = "今日 - ";
    else if (dateKey === yesterdayKey) prefix = "昨日 - ";

    return `${prefix}${month}月${day}日 (${dayOfWeek})`;
  }

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

<div class="px-4 py-4 space-y-6 pb-28">
  {#if stocks.length === 0}
    <!-- 空状態（Empty State） -->
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
