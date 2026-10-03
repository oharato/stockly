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

| ステップ | 実装内容 | 成果物 / コミット | ユーザー確認ポイント |
|---|---|---|---|
| **Step 1: 基盤セットアップ** | ・`.mise.toml`（Node.js LTS, pnpm, Pulumi）<br>・pnpm workspace 初期化 (`apps/web`, `apps/api`)<br>・Vite+ (`vp`) 導入と TypeScript 設定 | `chore: setup pnpm monorepo with svelte 5 and hono` | ・`vp check` による型チェック/リントがパスすること |
| **Step 2: バックエンド D1 + Hono API** | ・Cloudflare D1 ローカル設定 & マイグレーション SQL<br>・`stocks` テーブル作成<br>・ストック一覧取得・投稿・削除 API 実装<br>・Zod バリデーション | `feat(api): implement stocks crud with cloudflare d1` | ・ローカル API のリクエスト/レスポンス確認（Curl またはテスト） |
| **Step 3: フロントエンド UI 実装** | ・Svelte 5 + Tailwind CSS + `lucide-svelte`<br>・モバイルレイアウト（ヘッダー、タイムライン、ボトムナビ）<br>・ストックカード、入力モーダル（テンプレートボタン） | `feat(web): implement mobile ui components and modal` | **【ブラウザで実機確認】**<br>・画面全体の見た目、配色、ボタン配置、入力フォームの使い心地 |
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
