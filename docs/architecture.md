# システムアーキテクチャ & 設計書 (Cloudflare + Svelte 5 + Pulumi)

本書は、全インフラに **Cloudflare** を採用し、フロントエンドに **Svelte 5 + Vite+**、IaC として **Pulumi** を利用する前提のシステムアーキテクチャおよび技術選定の仕様書です。

---

## 1. システム構成概要 (Architecture Overview)

```
+-----------------------------------------------------------------------------------+
| [クライアント] スマートフォン / PC (PWA - Progressive Web App)                     |
| - Svelte 5 (Runes: $state, $derived, $effect) + TypeScript + Vite+ (`vp`)        |
| - Tailwind CSS + lucide-svelte                                                    |
| - vite-plugin-pwa (オフラインキャッシュ, ホーム画面インストール)                   |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / REST & RPC
                                          v
+-----------------------------------------------------------------------------------+
| [Cloudflare Platform]                                                             |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Cloudflare Workers (Backend API / Static Assets)                             |  |
|  | - Framework: Hono (TypeScript, 高速・型安全)                                |  |
|  +-------+--------------------+-------------------+---------------------+------+  |
|          |                    |                   |                     |         |
|          v                    v                   v                     v         |
|  +---------------+    +---------------+   +---------------+    +---------------+  |
|  | Cloudflare D1 |    | Cloudflare R2 |   | Workers AI    |    | Cloudflare KV |  |
|  | (サーバーレス |    | (画像・メディア   | (LLM自動      |    | (セッション・ |  |
|  |  SQLite DB)   |    |  ストレージ)      |  コメント生成)|    |  キャッシュ)  |  |
|  +---------------+    +---------------+   +---------------+    +---------------+  |
+-----------------------------------------------------------------------------------+
                                          ^
                                          | デプロイ・リソース構成管理
+-----------------------------------------+-----------------------------------------+
| [IaC] Pulumi (TypeScript) - @pulumi/cloudflare                                    |
| - D1 Database / R2 Bucket / Worker スクリプト / KV Namespace 等をコード管理        |
+-----------------------------------------------------------------------------------+
```

---

## 2. 技術スタック詳細

### 2.1 フロントエンド (PWA)

- **UIフレームワーク**: **Svelte 5**
  - 仮想DOMランタイム不要のコンパイル型アプローチにより、React等に比べてバンドルサイズが極小（~5KB）かつ初期起動が爆速。
  - **Runes（`$state`, `$derived`, `$effect`）** による直感的で安全なリアクティビティ。
- **統合ツールチェーン**: **Vite+ (`vp`)**
  - Rolldown 内包の超高速ビルド。Oxlint + Oxfmt によるゼロコンフィグリント＆フォーマット（`vp check`）。
- **スタイル & UI**: Tailwind CSS, `lucide-svelte`（アイコン）
- **PWA対応**: `vite-plugin-pwa`（Web App Manifest, Service Worker によるキャッシュとスタンドアロン起動）

### 2.2 バックエンド (API Server)

- **基盤**: Cloudflare Workers
- **Webフレームワーク**: **Hono**
  - Cloudflare Workers に特化した超軽量・高速 Web フレームワーク
  - Hono Client によるフロントエンドとバックエンドの**End-to-End型安全RPC**通信が可能

### 2.3 データベース & ストレージ

- **データベース**: **Cloudflare D1**
  - エッジ分散のサーバーレス SQLite。超低レイテンシでトランザクションをサポート。
- **画像ストレージ**: **Cloudflare R2** (Milestone 3~)
  - S3互換のエグレス料金ゼロのオブジェクトストレージ。ストックへの画像添付に使用。
- **キャッシュ / セッション**: **Cloudflare KV**

### 2.4 AI機能 (Stockly-AI)

- **基盤**: **Cloudflare Workers AI**
  - モデル候補: `@cf/meta/llama-3.1-8b-instruct`
  - 投稿時に非同期（`ctx.waitUntil`）で共感・内省コメントを自動生成。

### 2.5 IaC (Infrastructure as Code)

- **ツール**: **Pulumi** (TypeScript: `@pulumi/pulumi`, `@pulumi/cloudflare`)
- D1 Database / R2 Bucket / KV / Workers を完全コード管理。

---

## 3. データモデル (Cloudflare D1 / SQLite スキーマ)

```sql
-- ストック本体
CREATE TABLE IF NOT EXISTS stocks (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    image_keys TEXT, -- JSON配列文字列 (R2のオブジェクトキー、Milestone 3以降)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- タグ・目標・テーマ紐付け
CREATE TABLE IF NOT EXISTS stock_tags (
    id TEXT PRIMARY KEY,
    stock_id TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- AIコメント
CREATE TABLE IF NOT EXISTS ai_comments (
    id TEXT PRIMARY KEY,
    stock_id TEXT NOT NULL UNIQUE,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- ユーザー統計 & ゲーミフィケーション (シングルユーザー用: id='default')
CREATE TABLE IF NOT EXISTS user_stats (
    id TEXT PRIMARY KEY DEFAULT 'default',
    score INTEGER DEFAULT 0,
    total_stocks INTEGER DEFAULT 0,
    rediscovery_count INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_stock_date TEXT -- YYYY-MM-DD
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stocks_created ON stocks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_tags_stock_id ON stock_tags(stock_id);
```
