<script lang="ts">
  import { Flame, Sparkles } from "lucide-svelte";

  interface Props {
    streak?: number;
    totalStocks?: number;
  }

  let { streak = 0, totalStocks = 0 }: Props = $props();
</script>

<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
  <div class="flex items-center gap-2">
    <div class="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-600/30">
      <Sparkles class="w-4 h-4" />
    </div>
    <div>
      <h1 class="text-lg font-bold tracking-tight text-slate-900 leading-none">Stockly</h1>
      <p class="text-[10px] text-slate-500 font-medium tracking-wide">DAILY REFLECTION</p>
    </div>
  </div>

  <div class="flex items-center gap-2">
    <!-- 継続ストリークバッジ -->
    <div class="flex items-center gap-1 bg-amber-50 border border-amber-200/80 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs">
      <Flame class="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
      <span>{streak}日</span>
    </div>

    <!-- 総ストック数バッジ -->
    <div class="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium">
      <span class="text-slate-400 font-normal">計</span>
      <span class="font-bold text-slate-700 ml-0.5">{totalStocks}</span>
    </div>
  </div>
</header>
