<script lang="ts">
  import { X, Send, Sparkles, Loader2, ImagePlus, Trash2 } from "lucide-svelte";

  interface Props {
    isOpen: boolean;
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (content: string, imageFile?: File | null) => Promise<void> | void;
  }

  let { isOpen, isSubmitting = false, onClose, onSubmit }: Props = $props();

  let content = $state("");
  let selectedTemplate = $state<string | null>(null);
  let selectedFile = $state<File | null>(null);
  let previewUrl = $state<string | null>(null);
  let fileInputRef = $state<HTMLInputElement | null>(null);

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

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      selectedFile = file;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      previewUrl = URL.createObjectURL(file);
    }
  }

  function removeSelectedFile() {
    selectedFile = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    if (fileInputRef) {
      fileInputRef.value = "";
    }
  }

  async function handleSubmit() {
    if (!content.trim() || isSubmitting) return;
    await onSubmit(content.trim(), selectedFile);
    content = "";
    selectedTemplate = null;
    removeSelectedFile();
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
      <div class="p-5 flex-1 overflow-y-auto space-y-3">
        <textarea
          bind:value={content}
          disabled={isSubmitting}
          placeholder="今日学んだこと、反省、次に試したいことを書き出してみましょう..."
          rows="6"
          class="w-full text-slate-800 text-base placeholder:text-slate-400 placeholder:text-sm resize-none focus:outline-none leading-relaxed bg-transparent"
        ></textarea>

        {#if previewUrl}
          <div class="relative inline-block rounded-xl overflow-hidden border border-slate-200 shadow-2xs group">
            <img src={previewUrl} alt="添付画像プレビュー" class="h-28 w-auto object-cover rounded-xl" />
            <button
              type="button"
              onclick={removeSelectedFile}
              disabled={isSubmitting}
              aria-label="画像を削除"
              class="absolute top-1.5 right-1.5 p-1 bg-slate-900/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        {/if}
      </div>

      <!-- フッター（画像添付ボタン & 文字数 & 送信ボタン） -->
      <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-2xl">
        <div class="flex items-center gap-3">
          <!-- 非表示の file input -->
          <input
            bind:this={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onchange={handleFileSelect}
            class="hidden"
            id="stock-image-input"
          />
          <label
            for="stock-image-input"
            class="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-teal-700 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors shadow-2xs"
          >
            <ImagePlus class="w-4 h-4 text-teal-600" />
            <span>画像添付</span>
          </label>

          <span class="text-xs text-slate-400 font-mono">
            {content.length} / 2000文字
          </span>
        </div>

        <button
          type="button"
          onclick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          class="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm shadow-teal-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
