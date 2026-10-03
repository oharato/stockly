<script lang="ts">
  import { Search, X } from "lucide-svelte";

  interface Props {
    value: string;
    onInput: (val: string) => void;
    onClear: () => void;
    placeholder?: string;
  }

  let {
    value = "",
    onInput,
    onClear,
    placeholder = "内省メモをキーワード検索...",
  }: Props = $props();

  let inputElement = $state<HTMLInputElement | null>(null);

  function handleClear() {
    onClear();
    inputElement?.focus();
  }
</script>

<div class="relative w-full">
  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
    <Search class="w-4 h-4" />
  </div>

  <input
    bind:this={inputElement}
    type="search"
    {value}
    oninput={(e) => onInput(e.currentTarget.value)}
    {placeholder}
    aria-label="ストックを検索"
    class="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
  />

  {#if value}
    <button
      type="button"
      onclick={handleClear}
      aria-label="検索条件をクリア"
      class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
    >
      <div class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
        <X class="w-3 h-3 text-slate-500" />
      </div>
    </button>
  {/if}
</div>

<style>
  /* ブラウザ標準のクリアボタンを非表示化（重複防止） */
  input[type="search"]::-webkit-search-cancel-button,
  input[type="search"]::-webkit-search-decoration {
    -webkit-appearance: none;
    appearance: none;
    display: none;
  }
</style>
