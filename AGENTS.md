# AGENTS.md (開発ガイドライン & エージェント行動規範)

本ドキュメントは、**Stockly** プロジェクトにおいて AI エージェントが開発作業を行う際に、**例外なく常に遵守すべき基本ルール、技術スタック、開発プロセス、セキュリティ規約** をまとめたものです。

---

## 1. 言語・ツール・ランタイム規範

1. **言語 & パッケージマネージャー**:
   - 調査・実装ともに **TypeScript** および **pnpm** を常に使用すること（Python 等の別言語を独断で使用しない）。
   - すべてのパッケージ管理・スクリプト実行は `pnpm` を使用すること（`pnpm add`, `pnpm install`, `pnpm run` 等）。
2. **Node.js**:
   - 常にアクティブな **Node.js LTS** バージョンを使用すること。
3. **バージョン管理 (mise)**:
   - 言語ランタイム（Node.js）および各種 CLI ツールのバージョン管理には常に `mise` を使用すること。
   - ルートの `.mise.toml` に明示的にバージョンを固定すること。
4. **npm Registry & サプライチェーンセキュリティ**:
   - レジストリには `https://npm.flatt.tech` を使用すること（`.npmrc` で指定）。
   - **7日間のクールダウン**: 依存パッケージの新規追加やバージョン更新を行う際は、リリースから 7 日間以上経過したバージョンを使用すること。
5. **TypeScript 設定**:
   - バージョンはタグ（`@latest` 等）ではなく、リリースから7日以上経過した最新安定版を明示的に固定すること。
   - `tsconfig.json` では `strict: true` を含め、モダンなベストプラクティスを適用すること。

---

## 2. プロジェクト技術スタック

- **プロジェクト名**: **Stockly**（日々の内省・ストック PWA アプリ）
- **リポジトリ構成**: pnpm Monorepo (`apps/web`, `apps/api`, `infra`)
- **フロントエンド**: **Svelte 5** (Runes: `$state`, `$derived`, `$effect`) + Tailwind CSS + `lucide-svelte` + `vite-plugin-pwa`
- **統合ツールチェーン**: **Vite+ (`vp`) の徹底活用**
  - **原則**: 分散した個別ツール（ESLint, Prettier, 独立したVitest依存, Turborepo等）を個別導入・実行せず、Vite+ (`vp`) に組み込まれた高速Rust製ツールチェーン（Rolldown, Vitest, Oxlint, Oxfmt, tsdown, Vite Task）を最大限に活用すること。
  - **日常コマンド規約**:
    - **コード品質検査**: `vp check`（型チェック + Oxlint + Oxfmt の一括高速実行。自動修正は `vp check --fix`）
    - **ステージング検査**: `vp staged`（コミット対象ファイルのみを対象に高速リント・フォーマット）
    - **テスト実行**: `vp test --run`（内蔵 Vitest 5 による高速単体・統合テスト）
    - **開発サーバー**: `vp dev`（内蔵 Vite 8 による超高速 HMR）
    - **プロダクションビルド**: `vp build`（内蔵 Rolldown バンドラー）
    - **タスク実行 & キャッシュ**: `vp run <task>` または `vpr <task>`（自動キャッシュ対応のモノレポタスクランナー）
    - **パッケージ管理**: `vp install` (`vp i`), `vp add`, `vp remove`, `vp update`（pnpm を透過的にラップ）
  - **設定の一元化**: モノレポ全体の lint, fmt, check 等のルールはルートの `vite.config.ts`（`defineConfig`）で overrides を用いて一元管理する。
  - **仕様・ドキュメント参照**: 公式ドキュメント `https://viteplus.dev/llms-full.txt` および `https://viteplus.dev/guide/` に準拠する。
- **バックエンド API**: **Cloudflare Workers + Hono** (TypeScript)
- **型共有**: **Zod + Hono RPC (`hono/client`)**
  - バックエンドで定義した Zod スキーマと `AppType` をフロントエンドで型のみ参照し、完全な End-to-End 型安全性を保つ。
- **データベース**: **Cloudflare D1** (SQLite)
- **メディアストレージ**: **Cloudflare R2** (Milestone 3 以降)
- **AIエンジン**: **Cloudflare Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`、予備: `@cf/meta/llama-3.2-3b-instruct`)
- **IaC (インフラコード化)**: **Pulumi** (TypeScript: `@pulumi/cloudflare`)
- **Cloudflare CLI ツールチェーン**: **`cf` (`cf@1.0.0-beta.12`) の徹底使用**
  - **原則**: 従来の `wrangler` ではなく、Cloudflare 公式の次世代統合 CLI **`cf`** を全面的に使用すること。
  - Workers, D1, R2, DNS, WAF, そして Zero Trust Access の操作を一元実行する（例: `pnpm cf dev`, `pnpm cf deploy`, `pnpm cf d1 ...`）。
  - `pnpm run access:on` / `pnpm run access:off` による本番ドメインの保護・バイパス即時切替を活用すること。

---

## 3. 開発プロセス & コミット規約 (スモールステップ方式)

1. **反復型スモールステップサイクル**:
   - `[タスク宣言]` ➔ `[実装 & vp check 検証]` ➔ `[Git コミット & Push]` ➔ `[ユーザー動作確認 (プレビュー)]` ➔ `[フィードバック & 次へ]`
2. **コミット規約 (Conventional Commits)**:
   - `feat`: 新機能追加
   - `fix`: バグ修正
   - `chore`: 環境構築・設定・依存更新
   - `docs`: ドキュメント更新
   - `refactor`: リファクタリング
3. **コミット前必須チェック**:
   - コミットを作成する前に、必ず以下を実行してエラーゼロであることを確認する:
     - `vp check`（型検査・Oxlint・Oxfmt の確認、必要に応じて `--fix`）
     - `vp test --run`（単体・統合自動テスト全件パス）
     - `pnpm test:e2e:local`（E2E自動テスト全件パス。UI・API変更時およびリリース前必須）
     - （コミット対象のみの検証には `vp staged` も活用）

---

## 4. ドキュメンテーション重視 (Documentation First)

1. **仕様・ナレッジの即時文書化**:
   - 実装方針、環境構築手順、設定値、仕様変更、トラブルシューティングは、チャット内のやりとりのみで完結させず、必ず `docs/` 配下の該当ドキュメント（`requirements.md`, `ui-spec.md`, `detailed-design.md`, `milestones.md`, `development-plan.md`）に明確に残すこと。
2. **コードとドキュメントの完全同期**:
   - 機能追加や仕様変更、設定の修正を行った際は、関連するドキュメントも同時に更新し、常にドキュメントが最新の正となる状態を保つこと。

---

## 5. セキュリティ & プライバシー保護

1. **画像・プライベートデータの秘匿**:
   - ルートにある `*.png` 等のスクリーンショット画像には個人のプライベートなメモ情報が含まれているため、**絶対に Git コミット・公開リポジトリへ push してはならない**（`.gitignore` に追加済み）。
   - ドキュメント内にも個人データやスクリーンショットファイル名を記載しないこと。
2. **シークレット管理**:
   - API キーやアクセストークン等の機密情報はリポジトリにコミットせず、`.env*` や Cloudflare のシークレットバインディングで管理すること。

---

## 6. プレビュー実行規約

- ユーザーから「プレビューして」と指示された場合は、`0.0.0.0` でバインド起動し、ローカルURL（`http://localhost:<port>`）および同一LAN用URL（`http://<ローカルIP>:<port>`）をユーザーに案内すること。
- Markdown やドキュメントのプレビュー時は、プロジェクト内に不要な HTML を生成せずグローバルプレビュースクリプト（`node ~/.gemini/bin/preview-server.mjs [ポート]`）を使用すること。

---

## 7. UI変更時の自己検証規範 (事前スクリーンショット確認)

1. **ユーザー確認依頼前の視覚自己レビュー義務**:
   - UI コンポーネントの新規実装、スタイル修正、レイアウト変更を行った際は、**ユーザーに確認依頼やプレビュー案内を出す前に、必ずエージェント自身でヘッドレスブラウザ（Chromium）または Vitest Browser Mode によるスクリーンショットを撮影し、視覚的な崩れや表示重複がないか自己レビューを行うこと**。
2. **実行手順**:
   - ヘッドレス Chromium で画面をキャプチャ:
     ```bash
     mkdir -p ~/snap/chromium/current/preview && /snap/bin/chromium --headless --disable-gpu --window-size=412,892 --screenshot=$HOME/snap/chromium/current/preview/screen.png http://localhost:5173
     ```
   - 生成されたスクリーンショット画像をエージェントが確認し、以下を検証する:
     - アイコンやボタンの重複（例: ネイティブ input と独自コンポーネントの cancel button 重複）
     - テキストの溢れ・折り返し・見切れ
     - 配色・余白・グラデーション・アライメントの崩れ
   - 不具合を発見した場合はユーザーに報告する前に自力で修正・再撮影を行い、**「エージェントによる視覚確認済み」** の状態で報告すること。
3. **ファイル管理規約**:
   - 撮影した一時スクリーンショット画像は Git 管理対象外のディレクトリ（`~/snap/chromium/current/preview/` 等）に配置し、リポジトリ内にコミットしないこと。

---

## 8. フロントエンド設計規範 (リアクティビティ・通信・レートリミット耐性)

1. **`$effect` 内での外部 API 通信の原則禁止**:
   - Svelte 5 の `$effect` は依存状態の再評価に極めて敏感であり、意図しないカスケード（連鎖発火）や API 連打を招きやすい。
   - ネットワーク通信（API 呼び出し）は、原則として **「ユーザー操作のイベントハンドラ（`oninput`, `onclick` 等）」** または **「明示的なマウント時ライフサイクル（`onMount`）」** で呼び出すこと。
2. **インクリメンタル検索のローカルファースト原則**:
   - 検索バー等の連続入力 UI では、1文字入力ごとにサーバーへ GET リクエストを飛ばす設計を禁止する。
   - 原則として **「全件取得・マスターキャッシュ保持による 0ms 即時ローカルフィルタリング」**、または **「最低 300ms 以上のデバウンス制御」** を必須とする。
3. **エッジレートリミット (HTTP 429) & オフライン耐性設計**:
   - Cloudflare Workers などのエッジ環境では、同一 IP からの連続リクエストに対して即座に `HTTP 429 (Too Many Requests)` のスロットリングが発動する。
   - すべてのフロントエンド API 呼び出しは、429 やネットワークエラー時でもローカルキャッシュによる画面表示を維持し、ユーザーに過剰なエラーバナーを出さないフォールバック耐性を最初から組み込むこと。

---

## 9. PWA & キャッシュライフサイクル管理規約

1. **強制キャッシュクリア & Service Worker パージ機構の常設 (Day 1 必須)**:
   - PWA（`vite-plugin-pwa`）の Service Worker はブラウザの `CacheStorage` に静的アセットを強固に保持するため、実機でのコード更新反映遅延が頻発する。
   - PWA を導入するすべてのアプリにおいて、初期実装時点で **「ワンタップで全 Service Worker 登録解除（`unregister`）と CacheStorage 完全消去（`caches.delete`）を行う更新機能（`forceClearCacheAndReload`）」** をヘッダー等に常設すること。
2. **Service Worker 更新の自動検知**:
   - `navigator.serviceWorker.addEventListener("controllerchange", ...)` を設定し、新しいワーカーがアクティブになった際に安全に自動リフレッシュされるライフサイクルを標準装備すること。

---

## 10. E2E テスト & リリース前品質ゲート規約

1. **Playwright による 2 系統テストの必須運用**:
   - アプリケーションのリリース前には、単体テスト（Vitest）に加えて **Playwright による E2E テスト** を必ず実行・全件パスさせること。
     - `pnpm test:e2e:local`: ローカル開発環境（フロント 5173 + API 8787）での CRUD フルサイクル自動検証
     - `pnpm test:e2e:prod`: 本番環境ドメイン（実ネットワーク）に対する接続・表示・検索検証
2. **高速入力・連続負荷耐性の自動検証**:
   - E2E テストケースには、人間やスクリプトによる高速タイピングや連続操作をシミュレートするテストを含め、エッジレートリミット（HTTP 429）や画面破壊が起きないことを自動保証すること。
