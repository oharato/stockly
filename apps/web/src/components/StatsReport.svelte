<script lang="ts">
  import type { StockItem, GoalItem, TagItem, UserStats } from "../types/stock";
  import {
    Flame,
    Trophy,
    Zap,
    TrendingUp,
    Target,
    Plus,
    Trash2,
    Calendar,
    Sparkles,
    BarChart3,
    Check,
    X,
  } from "lucide-svelte";
  import { getDateKey } from "../utils/date";

  interface Props {
    stats: UserStats;
    stocks: StockItem[];
    tags: TagItem[];
    goals: GoalItem[];
    onCreateGoal?: (title: string, category?: string, color?: string) => Promise<void>;
    onDeleteGoal?: (id: string) => Promise<void>;
  }

  let {
    stats,
    stocks = [],
    tags = [],
    goals = [],
    onCreateGoal,
    onDeleteGoal,
  }: Props = $props();

  // 新規目標追加フォームの開閉状態
  let isAddGoalOpen = $state(false);
  let newGoalTitle = $state("");
  let newGoalCategory = $state("general");
  let isSubmittingGoal = $state(false);

  const categories = [
    { id: "general", label: "全般", icon: "🌱" },
    { id: "career", label: "仕事・キャリア", icon: "💼" },
    { id: "learning", label: "学習・スキル", icon: "📚" },
    { id: "health", label: "健康・生活習慣", icon: "🏃" },
    { id: "mindset", label: "マインド・思考", icon: "🧘" },
  ];

  // 直近7日間の活動推移データを計算
  let weeklyActivity = $derived.by(() => {
    const days: { label: string; dateKey: string; count: number; isToday: boolean }[] = [];
    const now = new Date();

    // 過去6日前から今日までの7日間
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;
      const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];

      const count = stocks.filter((s) => getDateKey(s.created_at) === dateKey).length;
      days.push({
        label: i === 0 ? "今日" : `${dayOfWeek}`,
        dateKey,
        count,
        isToday: i === 0,
      });
    }

    const maxCount = Math.max(...days.map((d) => d.count), 1);
    const totalWeekly = days.reduce((acc, d) => acc + d.count, 0);

    return { days, maxCount, totalWeekly };
  });

  // タグ別・内省シェアの計算
  let tagDistribution = $derived.by(() => {
    const totalTagsCount = tags.reduce((acc, t) => acc + t.count, 0);
    if (totalTagsCount === 0) return [];

    return tags.slice(0, 5).map((t) => ({
      name: t.name,
      count: t.count,
      percentage: Math.round((t.count / totalTagsCount) * 100),
    }));
  });

  async function handleAddGoalSubmit() {
    if (!newGoalTitle.trim() || isSubmittingGoal || !onCreateGoal) return;
    isSubmittingGoal = true;
    try {
      await onCreateGoal(newGoalTitle.trim(), newGoalCategory);
      newGoalTitle = "";
      newGoalCategory = "general";
      isAddGoalOpen = false;
    } finally {
      isSubmittingGoal = false;
    }
  }
</script>

<div class="space-y-5 pb-28">
  <!-- レベル & スコアカード -->
  <div class="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-6 text-white shadow-lg shadow-teal-700/20 relative overflow-hidden">
    <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none"></div>
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-teal-200 tracking-wider">REFLECTIVE LEVEL</span>
      <div class="flex items-center gap-1 bg-white/10 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-medium text-teal-100">
        <Sparkles class="w-3.5 h-3.5 text-amber-300" />
        <span>内省マスター</span>
      </div>
    </div>

    <div class="flex items-baseline gap-2 mt-2">
      <span class="text-4xl font-black tracking-tight">{stats.score}</span>
      <span class="text-teal-200 text-sm font-medium">ポイント</span>
    </div>

    <p class="text-xs text-teal-100/90 mt-3 leading-relaxed">
      日々のストック (+10pt) や再発見の振り返り (+20pt) を通じてあなたの自己内省習慣が蓄積されています。
    </p>
  </div>

  <!-- 4大メトリクスグリッド (2x2) -->
  <div class="grid grid-cols-2 gap-3">
    <!-- スコア -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div class="flex items-center gap-1.5 text-teal-600 mb-1.5">
        <TrendingUp class="w-4 h-4" />
        <span class="text-xs font-bold text-slate-500">累計スコア</span>
      </div>
      <p class="text-2xl font-black text-slate-900 font-mono">{stats.score} <span class="text-xs font-normal text-slate-400">pt</span></p>
    </div>

    <!-- 累計ストック -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div class="flex items-center gap-1.5 text-teal-600 mb-1.5">
        <Trophy class="w-4 h-4" />
        <span class="text-xs font-bold text-slate-500">累計ストック</span>
      </div>
      <p class="text-2xl font-black text-slate-900 font-mono">{stats.total_stocks} <span class="text-xs font-normal text-slate-400">件</span></p>
    </div>

    <!-- 連続ストリーク -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div class="flex items-center gap-1.5 text-amber-500 mb-1.5">
        <Flame class="w-4 h-4 fill-amber-500" />
        <span class="text-xs font-bold text-slate-500">連続ストリーク</span>
      </div>
      <p class="text-2xl font-black text-slate-900 font-mono">{stats.streak} <span class="text-xs font-normal text-slate-400">日連続</span></p>
    </div>

    <!-- 今日の再発見 -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div class="flex items-center gap-1.5 text-amber-600 mb-1.5">
        <Zap class="w-4 h-4 fill-amber-500" />
        <span class="text-xs font-bold text-slate-500">再発見の振り返り</span>
      </div>
      <p class="text-2xl font-black text-slate-900 font-mono">{stats.rediscovery_count} <span class="text-xs font-normal text-slate-400">回</span></p>
    </div>
  </div>

  <!-- 週間活動推移チャート -->
  <section class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
          <BarChart3 class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-800">直近7日間の活動推移</h3>
          <span class="text-[11px] text-slate-400 font-medium">今週の投稿: {weeklyActivity.totalWeekly} 件</span>
        </div>
      </div>
    </div>

    <!-- バーチャート表示 -->
    <div class="pt-3 pb-1 flex items-end justify-between gap-2 h-36 border-b border-slate-100">
      {#each weeklyActivity.days as day (day.dateKey)}
        {@const heightPct = Math.max(12, Math.round((day.count / weeklyActivity.maxCount) * 100))}
        <div class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
          <!-- カウントバッジ -->
          <span class={`text-[10px] font-mono font-bold transition-opacity ${
            day.count > 0 ? (day.isToday ? "text-teal-700" : "text-slate-600") : "text-slate-300"
          }`}>
            {day.count}
          </span>

          <!-- バー本体 -->
          <div
            style={`height: ${day.count > 0 ? heightPct : 6}%;`}
            class={`w-full max-w-7 rounded-t-lg transition-all ${
              day.isToday
                ? "bg-teal-600 group-hover:bg-teal-700 shadow-xs shadow-teal-600/30"
                : day.count > 0
                  ? "bg-teal-400/80 group-hover:bg-teal-500"
                  : "bg-slate-100"
            }`}
          ></div>

          <!-- 曜日ラベル -->
          <span class={`text-[11px] font-medium mt-1 ${
            day.isToday ? "text-teal-700 font-bold" : "text-slate-400"
          }`}>
            {day.label}
          </span>
        </div>
      {/each}
    </div>
  </section>

  <!-- テーマ・目標別 内省バランス -->
  <section class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
        <TrendingUp class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-800">テーマ別 内省バランス</h3>
        <span class="text-[11px] text-slate-400 font-medium">どのような領域に思考をストックしているか</span>
      </div>
    </div>

    {#if tagDistribution.length === 0}
      <p class="text-xs text-slate-400 leading-relaxed py-2">
        まだテーマ・タグ付きのストックがありません。投稿時に「+ テーマ・目標を設定」からタグを付けると、内省のバランスがここに表示されます。
      </p>
    {:else}
      <div class="space-y-3 pt-1">
        {#each tagDistribution as item (item.name)}
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-slate-700">#{item.name}</span>
              <span class="text-slate-400 font-mono text-[11px]">{item.count}件 ({item.percentage}%)</span>
            </div>
            <!-- プログレスバー -->
            <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                style={`width: ${item.percentage}%;`}
                class="h-full bg-teal-500 rounded-full transition-all duration-300"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- 目標・ビジョン管理セクション -->
  <section class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <Target class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-800">目標・ビジョン</h3>
          <span class="text-[11px] text-slate-400 font-medium">あなたが目指す姿と連動した内省</span>
        </div>
      </div>

      <button
        type="button"
        onclick={() => (isAddGoalOpen = !isAddGoalOpen)}
        class="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
      >
        {#if isAddGoalOpen}
          <X class="w-3.5 h-3.5" />
          <span>閉じる</span>
        {:else}
          <Plus class="w-3.5 h-3.5" />
          <span>目標を追加</span>
        {/if}
      </button>
    </div>

    <!-- 目標追加フォーム -->
    {#if isAddGoalOpen}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleAddGoalSubmit();
        }}
        class="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3 animate-in slide-in-from-top-1 duration-150"
      >
        <div>
          <label for="goal-title-input" class="block text-xs font-bold text-slate-600 mb-1">
            目標・ありたい姿
          </label>
          <input
            id="goal-title-input"
            type="text"
            bind:value={newGoalTitle}
            placeholder="例: フロントエンド技術の習熟、健康習慣の定着..."
            maxlength="100"
            class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label for="goal-cat-select" class="block text-xs font-bold text-slate-600 mb-1">
            カテゴリー
          </label>
          <div class="flex flex-wrap gap-1.5">
            {#each categories as cat (cat.id)}
              <button
                type="button"
                onclick={() => (newGoalCategory = cat.id)}
                class={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                  newGoalCategory === cat.id
                    ? "bg-teal-600 text-white border-teal-600 shadow-2xs font-semibold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{cat.icon} {cat.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="flex justify-end pt-1">
          <button
            type="submit"
            disabled={!newGoalTitle.trim() || isSubmittingGoal}
            class="text-xs px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
          >
            {isSubmittingGoal ? "保存中..." : "保存する"}
          </button>
        </div>
      </form>
    {/if}

    <!-- 登録済み目標一覧 -->
    {#if goals.length === 0}
      <div class="text-center py-6 border border-dashed border-slate-200 rounded-xl px-4">
        <Target class="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p class="text-xs text-slate-500 font-medium">登録されている目標がまだありません</p>
        <p class="text-[11px] text-slate-400 mt-1">
          「目標を追加」から人生の指針や学びのテーマを登録してみましょう。投稿時にタグとして選択できます。
        </p>
      </div>
    {:else}
      <div class="space-y-2 pt-1">
        {#each goals as goal (goal.id)}
          <div class="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl group hover:border-slate-300 transition-colors">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="text-base shrink-0">
                {categories.find((c) => c.id === goal.category)?.icon || "🎯"}
              </span>
              <div class="min-w-0">
                <h4 class="text-xs font-bold text-slate-800 truncate">{goal.title}</h4>
                <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span>{categories.find((c) => c.id === goal.category)?.label || "全般"}</span>
                  <span>•</span>
                  <span>{goal.stock_count} 件の内省</span>
                </div>
              </div>
            </div>

            {#if onDeleteGoal}
              <button
                type="button"
                onclick={() => onDeleteGoal(goal.id)}
                class="opacity-50 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-md transition-all text-slate-400 cursor-pointer shrink-0"
                aria-label="目標を削除"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
