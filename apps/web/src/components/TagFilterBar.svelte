<script lang="ts">
  import type { TagItem } from "../types/stock";
  import { Tag } from "lucide-svelte";

  interface Props {
    tags: TagItem[];
    selectedTag: string | null;
    onSelectTag: (tag: string | null) => void;
  }

  let { tags = [], selectedTag = null, onSelectTag }: Props = $props();
</script>

{#if tags.length > 0}
  <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
    <div class="flex items-center text-slate-400 shrink-0 mr-0.5">
      <Tag class="w-3.5 h-3.5" />
    </div>

    <!-- 「すべて」チップ -->
    <button
      type="button"
      onclick={() => onSelectTag(null)}
      class={`text-xs px-3 py-1 rounded-full transition-all shrink-0 font-medium cursor-pointer ${
        selectedTag === null
          ? "bg-teal-600 text-white shadow-xs font-semibold"
          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/90"
      }`}
    >
      すべて
    </button>

    <!-- 各タグチップ -->
    {#each tags as tag (tag.name)}
      <button
        type="button"
        onclick={() => onSelectTag(selectedTag === tag.name ? null : tag.name)}
        class={`text-xs px-2.5 py-1 rounded-full transition-all shrink-0 font-medium cursor-pointer flex items-center gap-1 ${
          selectedTag === tag.name
            ? "bg-teal-600 text-white shadow-xs font-semibold"
            : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/90"
        }`}
      >
        <span>#{tag.name}</span>
        <span
          class={`text-[10px] px-1 py-0.2 rounded-full ${
            selectedTag === tag.name ? "bg-teal-700/50 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {tag.count}
        </span>
      </button>
    {/each}
  </div>
{/if}
