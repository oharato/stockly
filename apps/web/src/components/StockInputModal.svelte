<script lang="ts">
  import { X, Send, Sparkles, Loader2 } from "lucide-svelte";

  interface Props {
    isOpen: boolean;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (content: string) => Promise<void> | void;
  }

  let { isOpen, isSubmitting = false, onClose, onSubmit }: Props = $props();

  let content = $state("");
  let selectedTemplate = $state<string | null>(null);

  const templates = [
    {
      id: "free",
      label: "自由記述",
      text: "",
    },
    {
      id: "ywt",
      label: "YWT",
      text: "【やったこと (Y)】\n・\n\n【わかったこと (W)】\n・\n\n【次にやること (T)】\n・",
    },
    {
      id: "kpt",
      label: "KPT",
      text: "【Keep (続けたいこと)】\n・\n\n【Problem (課題・困ったこと)】\n・\n\n【Try (次に試すこと)】\n・",
    },
    {
      id: "learn",
      label: "学び・気づき",
      text: "【今日の出来事】\n\n【何を感じたか・気づき】\n\n【教訓・次へのアクション】\n",
    },
  ];

  function applyTemplate(tmpl: (typeof templates)[0]) {
    selectedTemplate = tmpl.id;
    if (tmpl.text) {
      if (!content.trim() || confirm("入力中の内容をテンプレートで置き換えますか？")) {
        content = tmpl.text;
      }
    }
  }

  async function handleSubmit() {
    if (!content.trim() || isSubmitting) return;
    await onSubmit(content.trim());
    content = "";
    selectedTemplate = null;
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  }
</script>

{#if isOpen}
  <!-- モーダル背景オーバーレイ -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === "Escape" && !isSubmitting && onClose()}
    class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity"
  >
    <!-- モーダル本体 (モバイルではボトムシート風) -->
    <div
      class="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-200"
    >
      <!-- モーダルヘッダー -->
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center">
            <Sparkles class="w-3.5 h-3.5" />
          </div>
          <h2 id="modal-title" class="text-base font-bold text-slate-800">内省をストックする</h2>
        </div>
        <button
          type="button"
          onclick={onClose}
          disabled={isSubmitting}
          aria-label="閉じる"
          class="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- テンプレート選択バー -->
      <div class="px-5 pt-3 pb-1 border-b border-slate-50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span class="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">型:</span>
        {#each templates as tmpl (tmpl.id)}
          <button
            type="button"
            onclick={() => applyTemplate(tmpl)}
            class={`text-xs px-2.5 py-1 rounded-full border transition-all shrink-0 font-medium ${
              selectedTemplate === tmpl.id
                ? "bg-teal-50 border-teal-300 text-teal-700 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tmpl.label}
          </button>
        {/each}
      </div>

      <!-- 入力テキストエリア -->
      <div class="p-5 flex-1 overflow-y-auto">
        <textarea
          bind:value={content}
          disabled={isSubmitting}
          placeholder="今日学んだこと、反省、次に試したいことを書き出してみましょう..."
          rows="8"
          class="w-full text-slate-800 text-base placeholder:text-slate-400 placeholder:text-sm resize-none focus:outline-none leading-relaxed bg-transparent"
        ></textarea>
      </div>

      <!-- フッター（文字数 & 送信ボタン） -->
      <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-2xl">
        <span class="text-xs text-slate-400 font-mono">
          {content.length} / 1000文字
        </span>

        <button
          type="button"
          onclick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          class="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm shadow-teal-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {#if isSubmitting}
            <Loader2 class="w-4 h-4 animate-spin" />
            <span>保存中...</span>
          {:else}
            <Send class="w-4 h-4" />
            <span>ストックする</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
