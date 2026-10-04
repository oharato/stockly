# 開発計画 & ワークフロー方針書 (Development Plan & Workflow)

本書は、Stockly の開発を安全かつ手戻りなく、テンポよく進めるための **開発プロセス、コミット規約、ステップ別タスク計画** を定義したドキュメントです。

---

## 1. 開発プロセス & サイクル (Development Cycle)

各マイルストーンを大きな塊で一気に作るのではなく、**タスクごとの「スモールステップ（小さな節目）でコミット＆動作確認」** する反復型アプローチを採用します。

```
[1. タスク着手宣言]
   エージェントが次に実装するステップの内容とゴールを明示
       │
[2. 実装 & 自動検証]
   コード実装 ＋ `vp check`（型チェック・Oxlint・Oxfmt）および単体テストをパス
       │
[3. Git コミット & プッシュ]
   機能単位で Conventional Commits に従った綺麗なコミットを作成して GitHub へ push
       │
[4. ユーザー動作確認 (プレビュー)]
   開発サーバーを起動し、ユーザーがブラウザやスマホ実機で画面・動作をチェック
       │
[5. フィードバック & 次のステップへ]
   改善要望があれば微調整し、OKであれば次のスモールステップへ進行
```

---

## 2. コミット規約 (Commit Convention)

Conventional Commits に準拠し、コミットログから変更内容が即座に把握できるようにします。

- `feat`: 新機能の追加（例: `feat(api): add stocks crud endpoints with d1`）
- `fix`: バグ修正
- `docs`: ドキュメントの追加・更新
- `chore`: 環境構築、設定変更、依存関係の更新（例: `chore: setup pnpm monorepo with svelte 5 and hono`）
- `refactor`: リファクタリング（機能変更なし）

---

## 3. Milestone 1 (MVP) ステップ別詳細計画

Milestone 1 を以下の **4つのスモールステップ** に分割して進めます。

| ステップ                                  | 実装内容                                                                                                                                                               | 成果物 / コミット                                       | ユーザー確認ポイント                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Step 1: 基盤セットアップ**              | ・`.mise.toml`（Node.js LTS, pnpm, Pulumi）<br>・pnpm workspace 初期化 (`apps/web`, `apps/api`)<br>・Vite+ (`vp`) 導入と TypeScript 設定                               | `chore: setup pnpm monorepo with svelte 5 and hono`     | ・`vp check` による型チェック/リントがパスすること                                                             |
| **Step 2: バックエンド D1 + Hono API**    | ・Cloudflare D1 ローカル設定 & マイグレーション SQL<br>・`stocks` テーブル作成<br>・ストック一覧取得・投稿・削除 API 実装<br>・Zod バリデーション                      | `feat(api): implement stocks crud with cloudflare d1`   | ・ローカル API のリクエスト/レスポンス確認（Curl またはテスト）                                                |
| **Step 3: フロントエンド UI 実装**        | ・Svelte 5 + Tailwind CSS + `lucide-svelte`<br>・モバイルレイアウト（ヘッダー、タイムライン、ボトムナビ）<br>・ストックカード、入力モーダル（テンプレートボタン）      | `feat(web): implement mobile ui components and modal`   | **【ブラウザで実機確認】**<br>・画面全体の見た目、配色、ボタン配置、入力フォームの使い心地                     |
| **Step 4: フロント・API 結合 & PWA 設定** | ・Zod + Hono RPC による End-to-End 型安全通信結線<br>・入力モーダルから D1 への保存とタイムライン自動反映<br>・`vite-plugin-pwa`（マニフェスト、スタンドアロンモード） | `feat: integrate api with svelte client and enable pwa` | **【Milestone 1 完了確認】**<br>・スマホのホーム画面追加テスト<br>・実際にストックを投稿・削除して動作チェック |

---

## 4. 動作確認（プレビュー）の手順

各ステップの完了時、以下のコマンドでプレビューサーバーを起動してユーザーに動作確認を依頼します：

- **フロントエンド UI プレビュー**:
  - `pnpm --filter web dev --host 0.0.0.0`
  - ローカルURL（`http://localhost:5173`）および同一LAN内のスマホ用URL（`http://<ローカルIP>:5173`）を案内。
- **フルスタック（フロント + API）プレビュー**:
  - `pnpm dev`（Vite 開発サーバー + Wrangler D1 ローカルサーバーの同時起動）

---

## 5. ドキュメンテーション同期ルール

機能追加や仕様変更が発生した場合は、実装完了と同時に `docs/detailed-design.md` や `docs/milestones.md` を更新し、**常にコードとドキュメントが完全に一致した状態** を保ちます。

---

## 6. 実装作業履歴 (Implementation Log)

本プロジェクトにおける実際の実装作業とコミットの履歴です。

### 2026-10-03 (プロジェクト立ち上げ & Milestone 1 進行中)

#### 1. 要件定義 & ドキュメント策定 (Documentation First)

- プロジェクト仕様書群（`requirements.md`, `ui-spec.md`, `architecture.md`, `detailed-design.md`, `milestones.md`, `development-plan.md`, `iac-pulumi.md`）および `AGENTS.md` の作成。
- リポジトリ初期化 & GitHub（`https://github.com/oharato/stockly`）への push。

#### 2. Milestone 1 - Step 1: 基盤セットアップ完了

- ランタイム環境固定: `.mise.toml`（Node.js `24.13.0`, pnpm `12.3.4`）。
- pnpm モノレポ構造の構築 (`apps/web`, `apps/api`)。
- `apps/web`: Svelte 5 (`5.57.0`), Tailwind CSS v4 (`4.3.3`), `vite-plugin-pwa` (`1.3.0`), `lucide-svelte` (`1.0.1`), TypeScript (`5.8.2`)。
- `apps/api`: Hono (`4.13.9`), `@hono/zod-validator` (`0.9.1`), Zod (`3.24.2`), `cf` (`1.0.0-beta.12`), `wrangler` (`4.141.0`)。
- 主なコミット: `ee8f9cc`, `2ce6331`, `df1e297`, `417cc3d`。

#### 3. Milestone 1 - Step 2: D1 + Hono CRUD API & 自動テスト完了

- D1 マイグレーション実行 (`0001_create_stocks.sql`): `stocks`, `tags`, `ai_comments`, `user_stats` の SQLite テーブルを作成。
- Zod スキーマ定義 (`apps/api/src/schemas/stock.ts`)。
- CRUD エンドポイント実装 (`apps/api/src/routes/stocks.ts`):
  - `GET /api/stocks`（一覧取得）
  - `POST /api/stocks`（新規内省の投稿）
  - `DELETE /api/stocks/:id`（内省の削除）
  - `GET /api/stats`（ストリーク・スコア等の統計取得）
- 自動単体テスト実装 (`apps/api/test/stocks.test.ts`):
  - インメモリ D1 モックを用いた全 6 件の API テストを作成し、`vp test` で 45ms で全件パス。
- 主なコミット: `75dab66`, `004fc5e`。

#### 4. 統合ツールチェーン Vite+ (`vp`) の最適化 & 型検査強化

- `pnpm-workspace.yaml` に overrides（`vite: npm:@voidzero-dev/vite-plus-core@1.0.0`, `vitest: 5.0.1`）を設定。
- プロジェクトルートに `vite-plus@1.0.0` を導入。
- ルート `vite.config.ts` で `lint.options.typeCheck: true` を有効化し、`vp check` でフォーマット・リントに加え TypeScript 型検査を一括高速実行できるように設定。
- VS Code 誤警告の要因だった `.vscode/mcp.json` を整理し、標準のルート `.mcp.json` に統一。
- 主なコミット: `efa8185`, `2b4769d`, `87e8ff4`。

#### 5. Milestone 1 - Step 3: フロントエンド UI 実装 (完了)

- Svelte 5 Runes (`$state`, `$derived`, `$props`) を全面採用したモバイルファースト UI を構築。
- 作成コンポーネント:
  - `Header.svelte`: ロゴ、ストリーク 🔥 表示、累計ストックバッジ
  - `BottomNav.svelte`: 下部ナビゲーションバー & フローティング `+` アクションボタン
  - `StockCard.svelte`: 内省カード表示（本文、時刻、削除ボタン、AIコメントプレースホルダー枠）
  - `Timeline.svelte`: 日付グループ見出し（今日、昨日、日付）付きリスト & 空状態（Empty State）UI
  - `StockInputModal.svelte`: 内省入力モーダル（YWT, KPT, 学びのクイックテンプレート、文字数カウント、送信ボタン）
  - `App.svelte`: タイムライン画面とふりかえり（統計レベル・連続ストリーク）画面の切り替え。
- 主なコミット: `9ba350b`。

#### 6. Milestone 1 - Step 4: フロント・API 結合 & PWA 設定 (完了)

- **Hono RPC 型安全通信結線**:
  - `apps/web/src/lib/api.ts`: Hono Client (`hc<AppType>`) を設定。
  - `apps/web/vite.config.ts`: `/api` 宛てのリクエストをローカル Workers API サーバー (`http://127.0.0.1:8787`) に転送する proxy 設定を追加。
- **Svelte 5 Runes ストア**:
  - `apps/web/src/lib/stocks.svelte.ts`: `stocks`, `stats`, `isLoading`, `isSubmitting`, `error` のリアクティブな状態管理と CRUD 操作メソッドを実装。
  - `App.svelte` と連携し、初期マウント時に D1 からストック一覧・統計データを取得。
- **PWA 設定**:
  - `vite-plugin-pwa` によるスタンドアロンマニフェスト、アプリアイコン設定、Service Worker 生成を検証。
- **End-to-End 動作確認**:
  - モーダルからの内省投稿 ➔ ローカル D1 への保存 ➔ タイムラインへの自動反映 ➔ 統計スコア加算 ➔ 削除の全サイクルが正常動作することを確認。
- 主なコミット: `15025d6`。

#### 7. テスト戦略策定 (Testing Trophy) & 単体・結合・E2Eテスト拡充 (完了)

- **テスト戦略ドキュメント策定**:
  - [`docs/test-strategy.md`](test-strategy.md): 従来の「テストピラミッド」の課題（過度なモック化、静的型付けとの重複）を分析し、現代フロントエンドで最も ROI が高い **「テストトロフィー (The Testing Trophy)」** モデルを採用。
- **4層のテストスイート構築**:
  1. **Static (静的検査)**: `vp check`（型検査・Oxlint・Oxfmt 一括実行）
  2. **Unit (単体テスト)**:
     - `apps/web/test/utils/date.test.ts`: 日付グループ化、フォーマット、時刻整形の境界値テスト（8件）
     - `apps/api/test/schemas/stock.test.ts`: Zod スキーマバリデーション（空文字、2000文字制限、タグ）の境界値テスト（7件）
  3. **Integration (結合テスト - トロフィーの中心層)**:
     - `apps/api/test/helpers/mock-db.ts`: 再利用可能なインメモリ D1 モックヘルパー
     - `apps/api/test/stocks.test.ts`: 基本的な CRUD & 統計エンドポイント結合テスト（6件）
     - `apps/api/test/integration/stocks-workflow.test.ts`: 複数投稿 ➔ ソート順確認 ➔ 統計加算 ➔ 不正入力拒否 ➔ 削除 ➔ 整合性確認の完全ライフサイクル結合テスト（1件）
  4. **E2E (End-to-End テスト)**:
     - `apps/web/test/e2e/api-e2e.test.ts`: 稼働中の Cloudflare Workers + D1 サーバーに対するリアルタイム HTTP 通信テスト（1件）
- **実行結果**:
  - 全 5 ファイル・23 テストがわずか **663ms** で全件合格。

#### 8. Milestone 2: Workers AI 非同期問いかけ生成 & 継続ストリーク & UI 自動更新 (完了)

- **Step 2-1: 継続ストリーク計算ロジック**:
  - `apps/api/src/utils/streak.ts`: 日本時間 (JST, UTC+9) に基づく当日・前日・過去の日付差分計算、連続日数判定関数（`calculateStreak`, `getJSTDateString`）を実装。
  - `apps/api/test/utils/streak.test.ts`: 初回投稿、当日連続投稿、翌日継続、2日以上ブランクによるリセット、最大記録更新の境界値テスト（6件全パス）。
  - `POST /api/stocks` でストック投稿時に自動で `current_streak`, `max_streak`, `last_stock_date` を算出して D1 `user_stats` を更新。
- **Step 2-2: Workers AI 非同期問いかけ生成サービス**:
  - `apps/api/src/services/ai.ts`: Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, フォールバック `@cf/meta/llama-3.2-3b-instruct`）を用いた内省問いかけ生成ロジック。
  - 内省を深める 3 原則（1. 労いと共感、2. 思考を深める問い、3. 具体的で短文・親しみやすいトーン）のシステムプロンプト設計。AI 未バインド時の決定論的フォールバック機構も完備。
  - `POST /api/stocks` で `c.executionCtx.waitUntil(aiPromise)` を活用し、クライアントへの HTTP 201 レスポンスを即座に返しつつ、バックグラウンドで AI 生成と `ai_comments` テーブルへの保存を並行実行。
  - `apps/api/test/services/ai.test.ts`: AI サービス統合テスト（フォールバック & Workers AI バインディングの 2 件全パス）。
- **Step 2-3: フロントエンド UI Polish & 自動反映 (Silent Polling)**:
  - `apps/web/src/components/StockCard.svelte`: AI コメントがある場合は Teal グラデーション枠と Sparkles アイコンで美しく表示。投稿直後（30秒以内）で生成中の場合はパルスアニメーション付きの「AI パートナーが問いかけを考えています...」を表示。
  - `apps/web/src/lib/stocks.svelte.ts`: `fetchStocks(silent = true)` による画面チラつきのないバックグラウンド再取得。ストック作成後、即座に `fetchStats()` でストリークを同期し、1.5秒後および3.5秒後に自動でサイレント取得を行って AI コメントをリアルタイム反映。
  - `apps/web/src/components/Header.svelte` & `App.svelte`: 🔥 連続ストリーク日数バッジ、累計ストック数、リフレクティブレベルスコアのシームレス表示。
- **Step 2-4: 統合検証 & E2E テスト拡充**:
  - `apps/api/test/integration/stocks-workflow.test.ts`: ストリーク加算の結合テストを追加。
  - `apps/web/test/e2e/api-e2e.test.ts`: 稼働中のローカルサーバーに対し、ストック作成から非同期 AI コメント生成のポーリング確認、ストリーク反映、削除クリーンアップまでの一連の E2E ライフサイクルテストを追加。
  - `vp check`: 0 warnings, 0 errors, 50 files formatted。
  - `vp test --run`: 7 ファイル・31 テストが **800〜900ms** で全件パス。
  - `vp run -r build`: Rolldown による Web (77.59 kB) & API の高速プロダクションビルド完全成功。

#### 9. アーキテクチャリファクタリング: `src/db/` データアクセス層の抽出 (完了)

- **背景**:
  - `routes/stocks.ts` にベタ書きされていた D1 SQL クエリを、詳細設計書（`docs/detailed-design.md`）の構想に基づき専用の関数ベースデータアクセス層（`src/db/`）へ分離。
- **分離内容**:
  - `apps/api/src/db/stocks.ts`: `listStocks`, `createStockWithStats`, `deleteStockWithStats`
  - `apps/api/src/db/stats.ts`: `getUserStats`, `getStreakContext`
  - `apps/api/src/db/ai-comments.ts`: `insertAIComment`
- **成果**:
  - `routes/stocks.ts`: 113 行から 78 行へスリム化。HTTP ルーティング・バリデーション・非同期 AI オーケストレーションに専念。
  - `services/ai.ts`: SQL 直接記述を廃止し、`insertAIComment` を利用。
  - `vp check`: 34 ファイル検査で 0 warnings, 0 errors。
  - `vp test --run`: 8 スイート・全 32 テストが **1.04s** で全件パス。

#### 10. Milestone 3: キーワード検索 & 1日1件「今日の再発見」機能 (完了)

- **Step 3-1: 本文キーワード検索機能**:
  - `apps/api/src/db/stocks.ts`: `listStocks(db, query?: string)` に D1 SQLite の `WHERE s.content LIKE ?` 部分一致検索ロジックを追加。
  - `apps/api/src/routes/stocks.ts`: `GET /api/stocks?q=...` クエリパラメータに対応。
  - `apps/api/test/db/stocks.test.ts` & `apps/api/test/stocks.test.ts`: キーワード部分一致検索、該当なし、空文字全件取得の単体・結合テストを追加。
  - `apps/web/src/components/SearchBar.svelte`: ルーペアイコン、クリアボタン、リアルタイム入力対応の検索バーコンポーネントを作成。
  - `apps/web/src/lib/stocks.svelte.ts`: 250ms デバウンス付きインクリメンタル検索処理をストアに組み込み。
  - `apps/web/src/components/Timeline.svelte`: 検索結果 0 件時の専用 Empty State UI を追加。
- **Step 3-2: 1日1件固定の「今日の再発見 (Rediscovery)」機能**:
  - `apps/api/src/db/stocks.ts`: `getDailyRediscoveryStock` 関数。過去（今日より前）のストックから、JST 日付（'YYYY-MM-DD'）のハッシュ値を用いた決定論的インデックス選択により、リロードしても同日中は同じ過去ストックが 1 件固定で表示されるロジックを実装。過去データ未作成時は最古のストックを安全にフォールバック。
  - `apps/api/src/db/stats.ts`: `incrementRediscoveryCount` 関数。読了アクション時に `rediscovery_count + 1`, `score + 20pt` を更新。
  - `apps/api/src/routes/stocks.ts`: `GET /api/stocks/rediscovery` および `POST /api/stocks/rediscovery/read` エンドポイントを新設。
  - `apps/web/src/components/RediscoveryCard.svelte`: タイムライン最上部に配置される、アンバー色グラデーションの「⚡ 今日の再発見」カード。過去の投稿日時の表示、本文プレビュー、AIコメント、「振り返った (+20pt)」インタラクティブ読了ボタン。
  - `apps/web/src/lib/stocks.svelte.ts`: `fetchRediscovery()` および `readRediscovery()` アクションでスコアと読了状態を即時更新。
- **Step 3-3: Cloudflare R2 による画像添付機能 (完了)**:
  - `apps/api/wrangler.jsonc`: R2 バケットバインディング設定 (`STORAGE: stockly-media`) を定義。ローカル Wrangler では `.wrangler/state/v3/r2` で自動永続化。
  - `apps/api/src/schemas/stock.ts`: `createStockSchema` に `imageKeys: z.array(z.string()).optional()` を追加。
  - `apps/api/src/db/stocks.ts`: `createStockWithStats` で `image_keys` を JSON 文字列として D1 SQLite に保存するよう拡張。
  - `apps/api/src/routes/stocks.ts`:
    - `POST /api/upload`: `multipart/form-data` からファイルを受信し、5MB 制限・許可 MIME タイプ（image/jpeg, png, webp, gif）の検証を経て R2 へ直接 `put`。ユニークなオブジェクトキーを生成して返却。
    - `GET /api/media/:key`: R2 からオブジェクトを `get` し、適切な `Content-Type` と `Cache-Control` ヘッダーを付与して配信。
  - `apps/web/src/lib/stocks.svelte.ts`: `uploadImage(file: File)` メソッドを実装。
  - `apps/web/src/components/StockInputModal.svelte`:
    - 画像添付ボタン（`ImagePlus`）と非表示 `<input type="file">`
    - アップロード前の画像サムネイルプレビュー & 削除用ゴミ箱ボタン
  - `apps/web/src/components/StockCard.svelte`:
    - ストックカード内に添付画像のグリッド/サムネイル表示
    - 画像タップ時に高解像度で閲覧できるフルスクリーンライトボックスモーダル（`X` 閉じるボタン付き）
- **品質・テスト・視覚自己検証 (`AGENTS.md` Rule 7 準拠)**:
  - `apps/web/test/e2e/api-e2e.test.ts`: 実サーバーに対する画像の R2 アップロード ➔ メディア取得 ➔ ストックへの添付 ➔ 削除の全サイクル自動 E2E テストを追加。
  - `vp check`: **0 warnings, 0 errors, 54 files formatted**
  - `vp test --run`: **全 8 スイート 36 テスト全件パス**
  - ヘッドレス Chromium (`/snap/bin/chromium --headless`) による視覚自己レビューを実施。タイムライン、再発見カード、入力モーダル、画像添付ボタンの配置崩れ・重複がないことを確認済み。
  - `vp run -r build`: Web & API の高速プロダクションビルド成功。

#### 11. Milestone 4: 目標・ビジョン管理 & レポート画面 (完了)

- **Step 4-1: テーマ・目標タグのデータモデル & CRUD API (完了)**:
  - `apps/api/migrations/0002_create_goals.sql`: 目標・ビジョン管理用の `goals` テーブル作成マイグレーションを定義・適用。
  - `apps/api/src/schemas/stock.ts`: `goalSchema`, `createGoalSchema`, `tagSummarySchema` を追加し、`stockSchema` に `tags` 配列を追加。
  - `apps/api/src/db/goals.ts`: `listGoals`, `createGoal`, `deleteGoal`, `listTags` を提供する専用データアクセスモジュールを作成。
  - `apps/api/src/db/stocks.ts`: D1 SQLite の `GROUP_CONCAT(DISTINCT t.name)` を用いてストックに紐づくタグ一覧を効率的に取得・マッピング。`tag` クエリパラメータによるフィルタリングに対応。
  - `apps/api/src/routes/stocks.ts`: `GET /api/tags`, `GET /api/goals`, `POST /api/goals`, `DELETE /api/goals/:id` を新設し、`POST /api/stocks` での `tagNames` バッチ保存と `GET /api/stocks?tag=...` を実装。
- **Step 4-2: フロントエンド: タグ付け & タイムラインフィルター (完了)**:
  - `apps/web/src/components/StockInputModal.svelte`: `[+ テーマ・目標を設定]` ボタンから、設定済み目標・タグの候補チップおよび新規タグの直接追加入力に対応。
  - `apps/web/src/components/StockCard.svelte`: 各ストックカード内に `#タグ名` のチップバッジを表示。
  - `apps/web/src/components/TagFilterBar.svelte`: タイムライン最上部に横スクロール可能なタグフィルターバー（「すべて」「#タグ名」）を配置。
  - `apps/web/src/components/Timeline.svelte`: タグフィルター時の専用 Empty State UI（「#タグのストックはありません」）を実装。
- **Step 4-3: 「ふりかえり」レポート & 統計ダッシュボード (完了)**:
  - `apps/web/src/components/StatsReport.svelte`:
    - **REFLECTIVE LEVEL カード**: スコアと内省マスターバッジをあしらったモダンなグラデーションヘッダー。
    - **4大メトリクス (2x2)**: 累計スコア、累計ストック件数、連続ストリーク日数、再発見の振り返り回数を一覧表示。
    - **直近7日間の活動推移チャート**: 日次ストック数を視覚化する CSS バーグラフ（今日ハイライト、曜日別ラベル、今週合計）。
    - **テーマ別 内省バランス**: タグ別のストック割合（％）とプログレスバーによる可視化。
    - **目標・ビジョン管理**: 目標一覧カード（カテゴリ、紐づく内省件数）および「+ 目標を追加」フォーム。
- **品質・テスト・視覚自己検証 (`AGENTS.md` Rule 7 準拠)**:
  - `apps/web/test/e2e/api-e2e.test.ts`: 実サーバーに対するタグ付きストック作成 ➔ タグ一覧取得 ➔ タグ絞り込み ➔ 目標 CRUD の自動 E2E テストを追加。
  - `vp check`: **0 warnings, 0 errors**
  - `vp test --run`: **全 8 スイート 38 テスト全件パス**
  - ヘッドレス Chromium (`/snap/bin/chromium --headless`) による視覚自己レビューを実施。タイムライン、タグフィルターバー、投稿モーダルのタグ選択、ふりかえり画面の活動バーチャート・メトリクスカードの表示崩れがないことを確認済み。
  - `vp run -r build`: Web & API の高速プロダクションビルド成功。

#### 12. Milestone 5: 本番 IaC プロビジョニング & 次世代 CLI 統合 (完了)

- **Step 5-1: Pulumi IaC & 本番プロビジョニング**: D1 (`stockly-db-prod`), R2 (`stockly-media-prod`) をコード化・適用完了。
- **Step 5-2: 本番デプロイ & cf CLI 移行**: `cf@1.0.0-beta.12` をモノレポ全体に配備。`https://stockly.ohchans.com` へのデプロイを確立。
- **Step 5-3: Cloudflare Access 認証保護**: 管理者メールへのワンタイム PIN 認証 (`access:on` / `access:off`) を導入。
- **Step 5-4: Playwright E2E テスト基盤整備**: ローカル起動アプリ用 (`test:e2e:local`) と本番用 (`test:e2e:prod`) の 2 系統の E2E 自動テストを構築。

#### 13. Milestone 6: 追加拡張 & CI/CD 自動化 (完了)

- **Step 6-1: Web Push 通知・リマインダー (完了)**:
  - `apps/web/src/lib/notifications.ts`: `Notification` 権限リクエスト、localStorage 保存、Service Worker `showNotification` 連携ロジック。
  - `apps/web/src/components/StatsReport.svelte`: 毎日の内省リマインダー UI（通知許可案内、時刻指定 `<input type="time">`、トグルスイッチ、テスト通知送信機能）。
- **Step 6-2: データエクスポート・バックアップ (完了)**:
  - `apps/api/src/utils/export.ts`: Markdown および RFC 4180 準拠 CSV フォーマッター。
  - `apps/api/src/routes/stocks.ts`: `GET /api/export?format=json|markdown|csv`。
  - `apps/web/src/components/StatsReport.svelte`: JSON / Markdown / CSV のワンタップダウンロードカード。
- **Step 6-3: 週次 AI サマリーレポート (完了)**:
  - `apps/api/migrations/0003_create_weekly_summaries.sql`: `weekly_summaries` テーブル作成・適用。
  - `apps/api/src/services/summary-ai.ts`: Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) による週次内省分析（注力テーマ、思考の軌跡と深まり、来週への問いかけ）& 決定論的フォールバック。
  - `apps/api/src/routes/stocks.ts`: `GET /api/summary/weekly`, `POST /api/summary/weekly/generate`。
  - `apps/web/src/components/StatsReport.svelte`: サマリーカード表示 & オンデマンド生成機能。
- **Step 6-4: Cloudflare Access 保護下の本番 E2E 自動実行基盤 (完了)**:
  - `cf zero-trust access service-tokens create`: 自動テスト専用の Service Token (`Stockly E2E Test Token`) を発行し、Access Application "Stockly" に `E2E Service Token Access` ポリシー (`decision: "non_identity"`) を常時配備。
  - `playwright.config.ts` & `scripts/run-e2e-prod.ts`: `.env` の Service Token 認証情報を自動読み込み、`CF-Access-Client-Id` / `CF-Access-Client-Secret` を HTTP ヘッダーに注入して Access ON のまま直接認証テストを実行。
  - `apps/web/src/lib/stocks.svelte.ts`: エッジレートリミット (HTTP 429) に対する 1.2 秒バックオフ自動リトライ機構。
  - `tests/e2e/prod.spec.ts`: 初期ロード ➔ キーワード検索 ➔ 高速タイピング耐性 ➔ タグフィルター ➔ ふりかえりタブ（週次サマリー・リマインダー・エクスポート）を一気通貫で検証。
- **検証実績**:
  - `vp check`: 0 warnings, 0 lint errors, 0 type errors.
  - `vp test --run`: 12 テストファイル（51 テスト）全件パス。
  - `pnpm test:e2e:local`: 3 テスト全件パス (11.3s)。
  - `pnpm test:e2e:prod`: **Access ON (完全保護) のまま、Service Token 認証で 1 テスト全件パス (4.3s)**。
