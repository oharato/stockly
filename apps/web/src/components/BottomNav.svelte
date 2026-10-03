<script lang="ts">
  import { Home, Plus, BarChart3 } from "lucide-svelte";

  interface Props {
    currentTab?: "timeline" | "stats";
    onTabChange?: (tab: "timeline" | "stats") => void;
    onOpenModal?: () => void;
  }

  let { currentTab = "timeline", onTabChange, onOpenModal }: Props = $props();
</script>

<nav class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-6 py-2 pb-safe max-w-md mx-auto">
  <div class="flex items-center justify-around relative">
    <!-- タイムラインタブ -->
    <button
      type="button"
      onclick={() => onTabChange?.("timeline")}
      class={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
        currentTab === "timeline" ? "text-teal-600 font-medium" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <Home class="w-5 h-5" />
      <span class="text-[11px]">ストック</span>
    </button>

    <!-- 中央のフローティング + ボタン -->
    <div class="relative -top-5">
      <button
        type="button"
        onclick={() => onOpenModal?.()}
        aria-label="新しい内省をストック"
        class="w-13 h-13 rounded-full bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-600/40 hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus class="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>

    <!-- 統計・インサイトタブ -->
    <button
      type="button"
      onclick={() => onTabChange?.("stats")}
      class={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
        currentTab === "stats" ? "text-teal-600 font-medium" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <BarChart3 class="w-5 h-5" />
      <span class="text-[11px]">ふりかえり</span>
    </button>
  </div>
</nav>
