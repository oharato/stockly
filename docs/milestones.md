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
