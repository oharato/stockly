# Stockly (日々のストック・内省 PWA アプリ)

日々の出来事、反省、気づきをストックし、AIの壁打ちコメントや過去の再発見（リマインド）を通じて内省・自己改善を促すリフレクションアプリです。

## 🛠 技術スタック & アーキテクチャ方針

- **フロントエンド**: PWA (Svelte 5 + TypeScript + Tailwind CSS + `lucide-svelte` + `vite-plugin-pwa`)
- **統合ツールチェーン**: Vite+ (`vp`)
- **バックエンド API**: Cloudflare Workers + Hono (TypeScript)
- **データベース**: Cloudflare D1 (分散サーバーレス SQLite)
- **メディアストレージ**: Cloudflare R2 (添付画像, Milestone 3~)
- **AIエンジン**: Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`)
- **IaC**: Pulumi (`@pulumi/cloudflare`)
- **パッケージマネージャー / ランタイム**: pnpm, Node.js LTS, mise

---

## 📁 ドキュメント一覧

- **[要件定義書](docs/requirements.md)**: アプリコンセプト、画面一覧、機能要件、非機能要件
- **[UI仕様書](docs/ui-spec.md)**: 各画面のUIレイアウト・コンポーネント仕様
- **[システムアーキテクチャ設計書](docs/architecture.md)**: Cloudflare + Svelte 5 + Pulumi の全体構成
- **[詳細設計書](docs/detailed-design.md)**: Svelte 5 Runes 状態管理、Zod + Hono RPC 型共有、非同期AIシーケンス、D1 スキーマ
- **[開発計画 & ワークフロー方針書](docs/development-plan.md)**: スモールステップ開発サイクル、コミット規約、タスク分割計画
- **[開発マイルストーン & ロードマップ](docs/milestones.md)**: MVP（コア体験）から段階的に進めるマイルストーン計画
- **[Pulumi IaC 設計書](docs/iac-pulumi.md)**: Pulumi による Cloudflare リソース管理方針
