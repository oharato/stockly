# 開発マイルストーン & ロードマップ (Milestones & Roadmap)

Svelte 5 + Vite+ (`vp`) + Cloudflare + Pulumi を採用した確定ロードマップです。

> 💡 日々の開発の進め方・コミット単位・動作確認フローは **[開発計画 & ワークフロー方針書](development-plan.md)** を参照してください。

---

## 🧭 マイルストーン概要

```
[ Milestone 1: MVP コア体験 (確定) ]
  │  ・基盤構築 (.mise.toml, pnpm workspace, Vite+ `vp`, Cloudflare Workers API)
  │  ・ローカル D1 データベース (stocks, user_stats)
  │  ・Svelte 5 によるストック投稿 (テキスト + テンプレート) & タイムライン一覧
  │  ・PWA ホーム画面インストール対応 & モバイルファーストUI
  ▼
[ Milestone 2: AIコメント & ゲーミフィケーション (確定) ]
  │  ・Cloudflare Workers AI (Llama 3.1) による非同期コメント生成 (ctx.waitUntil)
  │  ・スコア加算 (+10pt) & ストリーク判定 (連続記録日数)
  │  ・ホーム画面レイアウト (今日のストック、AIコメントアコーディオン、目標UI)
  ▼
[ Milestone 3: 「今日の再発見」 & 検索 & 画像添付 (確定) ]
  │  ・1日1件固定の「今日の再発見」カード抽出ロジック
  │  ・本文キーワード検索 & タグフィルター
  │  ・Cloudflare R2 による画像添付機能
  ▼
[ Milestone 4: 目標・ビジョン管理 & レポート画面 ]
  │  ・ビジョン & 目標のCRUD機能およびストックへのタグ付け
  │  ・レポート・統計チャート画面
  ▼
[ Milestone 5: Pulumi IaC 本番環境構築 & CI/CD ]
  │  ・Pulumi による Cloudflare リソース (D1, R2, KV, Workers) の自動プロビジョニング
  │  ・本番環境デプロイ自動化
```

---

## 📋 Milestone 1 (MVP) 詳細タスクリスト (完了 🎉)

- [x] **1.1 ツール・リポジトリ初期化**:
  - `.mise.toml`（Node.js LTS, pnpm, Pulumi）
  - pnpm workspace 設定（`apps/web`, `apps/api`）
  - Vite+ 設定（`vp check`, `vp test` の動作確認）
- [x] **1.2 バックエンド API (Hono on Cloudflare Workers)**:
  - `wrangler.jsonc` & ローカル D1 設定
  - `stocks` テーブルマイグレーション
  - CRUD エンドポイント実装（`GET /api/stocks`, `POST /api/stocks`, `DELETE /api/stocks/:id`, `GET /api/stats`）
  - 単体自動テスト（`apps/api/test/stocks.test.ts` 全 6 件パス）
- [x] **1.3 フロントエンド PWA (Svelte 5 + Tailwind + Vite+)**:
  - Svelte 5 コンポーネント構成（Header, BottomNav, StockCard, Timeline, StockInputModal）
  - Runes（`$state`, `$derived`）によるストック状態管理（`stocks.svelte.ts`）
  - ストック一覧画面（日付区切りヘッダー、カード表示、削除アクション）
  - `vite-plugin-pwa` 設定（マニフェスト、アプリアイコン、スタンドアロンモード）
- [x] **1.4 結合 & 動作検証**:
  - Zod + Hono RPC（`hc<AppType>`）によるフロント・API 完全型安全結線
  - `vp check`（Oxlint + Oxfmt + 型チェック）のパス確認
  - ブラウザおよびスマホでの PWA 動作テスト（投稿・削除・統計加算サイクル確認）

---

## 📋 Milestone 2 (AIコメント & ゲーミフィケーション) 詳細タスクリスト (完了 🎉)

- [x] **2.1 継続ストリーク & ゲーミフィケーション計算**:
  - JST (UTC+9) 基準の日付判定およびストリーク計算ロジック（`apps/api/src/utils/streak.ts`）
  - 境界値・日付跨ぎ単体テスト 6 件（`apps/api/test/utils/streak.test.ts`）
  - ストック投稿時に `current_streak`, `max_streak`, `last_stock_date`, `score (+10pt)` を D1 へ即時更新
- [x] **2.2 Workers AI 非同期問いかけ生成 (バックエンド)**:
  - Workers AI (`@cf/meta/llama-3.1-8b-instruct`) 連携サービス（`apps/api/src/services/ai.ts`）
  - 内省を深める 3 原則（共感、深掘りの問いかけ、短文トーン）プロンプト設計とフォールバック
  - `c.executionCtx.waitUntil` による非同期バックグラウンド処理（HTTP 201 即時返却）
  - AI サービス結合テスト 2 件（`apps/api/test/services/ai.test.ts`）
- [x] **2.3 フロントエンド UI Polish & リアルタイム反映**:
  - `StockCard.svelte`: Teal グラデーション + Sparkles アイコンによる問いかけ表示
  - 投稿直後の思考中アニメーション（`isThinking` パルス）
  - `stocks.svelte.ts`: `fetchStocks(silent = true)` による画面チラつき防止バックグラウンド再取得（1.5s / 3.5s auto polling）
  - `Header.svelte` & `App.svelte`: 🔥 連続ストリーク日数バッジ、累計ストック数、スコア表示
- [x] **2.4 統合検証 & E2E テスト**:
  - `apps/web/test/e2e/api-e2e.test.ts`: 実サーバーに対する非同期 AI 生成・ポーリング・ストリーク検証の E2E テスト
  - `vp check`: 0 errors / 0 warnings、コードフォーマット完全適合
  - `vp test --run`: 7 スイート 31 テスト全件パス (< 1s)
  - `vp run -r build`: Rolldown による Web (77.59 kB) & API プロダクションビルド成功

---

## 📋 Milestone 3 (「今日の再発見」 & 検索 & 画像添付) 詳細タスクリスト (完了 🎉)

- [x] **3.1 本文キーワード検索機能**:
  - `GET /api/stocks?q=...` クエリパラメータ対応と D1 SQL `LIKE` 検索（`apps/api/src/db/stocks.ts`）
  - 単体・結合テスト追加（`apps/api/test/db/stocks.test.ts`, `apps/api/test/stocks.test.ts`）
  - `SearchBar.svelte`: 入力・クリアボタン・インクリメンタルデバウンス検索 UI
  - 検索結果 0 件時の Empty State UI（`Timeline.svelte`）
- [x] **3.2 1日1件固定の「今日の再発見」機能**:
  - `GET /api/stocks/rediscovery`: 過去ストックから JST 日付ハッシュによる決定論的な 1 日 1 件固定抽出（`apps/api/src/db/stocks.ts`）
  - `POST /api/stocks/rediscovery/read`: 読了時のスコア加算 (+20pt) & 再発見数加算 (+1件)（`apps/api/src/db/stats.ts`）
  - `RediscoveryCard.svelte`: タイムライン最上部に配置される稲妻アイコン `⚡ 今日の再発見` カード
  - 「振り返った (+20pt)」インタラクティブ読了アクションボタン
  - E2E テスト拡充（実サーバーに対する検索および再発見サイクルの検証）
- [x] **3.3 Cloudflare R2 による画像添付機能**:
  - `wrangler.jsonc` R2 バインディング設定 (`STORAGE`, `stockly-media`)
  - バックエンド: `POST /api/upload` (5MB 制限, MIME タイプ検証) & `GET /api/media/:key`
  - D1 `stocks` テーブル `image_keys` (JSON配列文字列) 保存・取得対応
  - フロントエンド: `StockInputModal.svelte` での画像添付プレビュー・削除機能
  - `StockCard.svelte` でのサムネイル画像表示 & タップで拡大表示するフルスクリーンライトボックスモーダル
  - Live E2E テスト (`apps/web/test/e2e/api-e2e.test.ts`) での画像アップロード・取得・ストック添付の全フロー自動検証

---

## 📋 Milestone 4 (目標・ビジョン管理 & レポート画面) 詳細タスクリスト (次期開発 🚀)

- [ ] **4.1 テーマ・目標タグのデータモデル & CRUD API**:
  - D1 `tags` テーブルの活用 & `goals` テーブルマイグレーション（目標タイトル、ビジョン分類、カラー、ステータス）
  - API エンドポイント実装:
    - `GET /api/tags`: 使用中タグ一覧とストック件数の集計取得
    - `GET /api/goals`, `POST /api/goals`, `PUT /api/goals/:id`, `DELETE /api/goals/:id`: 目標・ビジョンの CRUD
    - `POST /api/stocks`: リクエストボディ `tagNames` に対応し、ストック作成と同時に `tags` レコードをバッチ保存
    - `GET /api/stocks?tag=...`: 特定タグによるフィルタリングクエリのサポート
  - API 単体・結合テスト（`apps/api/test/`）の実装
- [ ] **4.2 フロントエンド: タグ付け & タイムラインフィルター**:
  - `StockInputModal.svelte`: 「+ テーマ・目標を設定」UI、登録済みタグからのワンタップ選択、新規タグ追加
  - `StockCard.svelte`: カード内にタグチップ（`#エンジニアリング`, `#健康` 等）を表示
  - `Timeline.svelte`: 検索バー下に水平スクロール可能なタグフィルターチップ列（「すべて」「#タグA」「#タグB」...）を配置
  - `stocks.svelte.ts`: 選択中タグの状態管理とフィルタリング連動
- [ ] **4.3 「ふりかえり」レポート & 統計ダッシュボード画面**:
  - `apps/web/src/components/StatsReport.svelte`（ふりかえりタブの本格実装）:
    - **活動推移チャート**: 直近7日間・30日間のストック数を可視化する軽量バーグラフ（CSS/SVG）
    - **内省バランス**: テーマ・目標別のストック構成比率（プログレスバー / シェア分布）
    - **4大指標サマリー**: スコア（pt）、累計ストック（件）、今日の再発見読了（回）、連続ストリーク（日）
    - **ビジョン & 目標カード**: 設定中の目標一覧、進捗確認、新規目標の追加モーダル
- [ ] **4.4 品質検証 & E2E テスト & 視覚自己検証 (`AGENTS.md` Rule 7 準拠)**:
  - `apps/web/test/e2e/api-e2e.test.ts`: 目標・タグ作成 ➔ ストック紐付け ➔ タグ絞り込み ➔ レポート統計取得の全サイクル自動検証
  - ヘッドレス Chromium (`/snap/bin/chromium --headless`) による視覚自己レビュー（タグの折り返し、チャート描画、モバイル解像度での崩れ確認）
  - `vp check` & `vp test --run` 完全パス確認

---

## 📋 Milestone 5 (Pulumi IaC 本番環境構築 & CI/CD) 詳細タスクリスト

- [ ] **5.1 Pulumi IaC 定義 (`infra/`)**:
  - `@pulumi/cloudflare` によるインフラコード化
  - 本番用 Cloudflare D1 データベース (`stockly-db-prod`)
  - 本番用 Cloudflare R2 バケット (`stockly-media-prod`)
  - 本番用 Cloudflare Workers API (`stockly-api-prod`)
  - Cloudflare Pages / Workers によるフロントエンド配信設定
- [ ] **5.2 本番 D1 マイグレーション自動化**:
  - Pulumi 実行またはデプロイスクリプトによる本番 D1 へのマイグレーション適用手順の確立
- [ ] **5.3 GitHub Actions CI/CD パイプライン**:
  - PR / Push 時の `vp check`, `vp test --run` 自動実行
  - `main` ブランチマージ時の本番環境自動デプロイ
- [ ] **5.4 セキュリティ & シングルユーザー認証**:
  - Cloudflare Access (Zero Trust) による個人専用保護、または PIN パスコード保護の設定

---

## 📋 Milestone 6 (追加拡張 & 体験向上) 詳細タスクリスト (Future Polish)

- [ ] **6.1 Web Push 通知 / リマインダー**:
  - 毎晩の振り返りリマインダー通知（Service Worker + Push API）
- [ ] **6.2 データエクスポート & バックアップ**:
  - JSON / Markdown 形式での一括エクスポート機能
- [ ] **6.3 週次 AI サマリーレポート**:
  - 1週間のストックを Workers AI が統合要約し、週末の成長サマリーを提示
