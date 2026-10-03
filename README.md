# Stockly (日々のストック・内省 PWA アプリ)

日々の出来事、反省、気づきをストックし、AIの壁打ちコメントや過去の再発見（リマインド）を通じて内省・自己改善を促すリフレクションアプリです。

- **本番 URL**: **[https://stockly.ohchans.com](https://stockly.ohchans.com)** (PWA インストール対応)

---

## 🛠 技術スタック & アーキテクチャ方針

- **フロントエンド**: PWA (Svelte 5 Runes + TypeScript + Tailwind CSS + `lucide-svelte` + `vite-plugin-pwa`)
- **統合ツールチェーン**: **Vite+ (`vp`)** (Rolldown, Vitest, Oxlint, Oxfmt)
- **バックエンド API**: Cloudflare Workers + Hono (TypeScript)
- **データベース**: Cloudflare D1 (分散サーバーレス SQLite)
- **メディアストレージ**: Cloudflare R2 (`stockly-media-prod`, 画像添付)
- **AIエンジン**: Cloudflare Workers AI (**`@cf/meta/llama-3.3-70b-instruct-fp8-fast`**)
- **IaC**: Pulumi (`@pulumi/cloudflare`)
- **パッケージマネージャー / ランタイム**: pnpm, Node.js LTS, mise

---

## 🚀 クイックスタート & 開発手順

### 1. 環境構築

```bash
# 1. 依存関係のインストール
pnpm install

# 2. 環境変数設定 (.env)
cp .env.example .env
# .env に CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID を設定
```

### 2. ローカル開発サーバー起動

```bash
# Web 開発サーバー (0.0.0.0:5173)
pnpm dev

# API 開発サーバー (127.0.0.1:8787)
pnpm --filter api run dev
```

### 3. コード品質検査 & テスト (Vite+)

```bash
# 静的解析・フォーマット・型検査
vp check

# 自動修正
vp check --fix

# 単体 & 統合テスト実行
vp test --run
```

### 4. 過去データ移行 CLI (CSV インポート)

```bash
# ドライラン（検証のみ）
pnpm import:csv --dry-run

# ローカル D1 へインポート
pnpm import:csv --local

# 本番 D1 へインポート
pnpm import:csv --remote --db stockly-db-prod
```

---

## 📁 ドキュメント一覧

- **[要件定義書](docs/requirements.md)**: アプリコンセプト、画面一覧、機能要件、非機能要件
- **[UI仕様書](docs/ui-spec.md)**: 各画面のUIレイアウト・コンポーネント仕様
- **[システムアーキテクチャ設計書](docs/architecture.md)**: Cloudflare + Svelte 5 + Pulumi の全体構成
- **[詳細設計書](docs/detailed-design.md)**: Svelte 5 Runes 状態管理、Zod + Hono RPC 型共有、非同期AIシーケンス、D1 スキーマ
- **[AIモデル選定 & ベンチマーク調査報告書](docs/ai-model-benchmark.md)**: Workers AI 各モデルの実測比較、日本語品質、Neuron 試算、プロンプト設計
- **[開発計画 & ワークフロー方針書](docs/development-plan.md)**: スモールステップ開発サイクル、コミット規約、タスク分割計画
- **[開発マイルストーン & ロードマップ](docs/milestones.md)**: MVP（コア体験）から段階的に進めるマイルストーン計画
- **[Pulumi IaC 設計書](docs/iac-pulumi.md)**: Pulumi による Cloudflare リソース管理方針
- **[インフラ手順書 (Pulumi)](infra/README.md)**: 本番インフラプロビジョニング手順
