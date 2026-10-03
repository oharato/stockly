# Pulumi による Cloudflare インフラ設計書 (IaC Specification)

本ドキュメントでは、**Pulumi (TypeScript)** を用いて Cloudflare 上のインフラリソース（D1, R2, KV, Workers）をコード化・自動プロビジョニングする方針を定義します。

---

## 1. Pulumi 構成方針

### 1.1 プロバイダー & パッケージ
- プロバイダー: `@pulumi/cloudflare` (最新安定版)
- ランタイム: TypeScript
- パッケージマネージャー: pnpm

### 1.2 管理対象リソース一覧

| リソース種別 | Pulumi リソース名 | 用途 |
|---|---|---|
| **D1 Database** | `cloudflare.D1Database` | ストック・ユーザー・統計等のメインSQLiteデータベース |
| **R2 Bucket** | `cloudflare.R2Bucket` | ストックに添付される画像・写真ファイル保存 |
| **KV Namespace** | `cloudflare.WorkersKvNamespace` | セッション、一時トークン、キャッシュ |
| **Workers Script** | `cloudflare.WorkersScript` | バックエンド API (Hono) および Workers AI バインディング |
| **Pages Project / Worker** | `cloudflare.PagesProject` または Workers Static Assets | フロントエンド PWA のホスティング |
| **Custom Domain** | `cloudflare.Record` / `cloudflare.WorkerDomain` | カスタムドメインへのルーティング |

---

## 2. Pulumi コード構成例 (`infra/index.ts`)

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

const config = new pulumi.Config();
const accountId = config.require("cloudflareAccountId");

// 1. D1 Database の作成
const stocklyDb = new cloudflare.D1Database("stockly-db", {
    accountId: accountId,
    name: "stockly-production-db",
});

// 2. R2 Bucket の作成 (画像保存用)
const stocklyImagesBucket = new cloudflare.R2Bucket("stockly-images", {
    accountId: accountId,
    name: "stockly-production-images",
    location: "apac", // アジア太平洋リージョン
});

// 3. KV Namespace の作成 (キャッシュ・セッション用)
const stocklyKv = new cloudflare.WorkersKvNamespace("stockly-kv", {
    accountId: accountId,
    title: "stockly-production-kv",
});

// 4. Cloudflare Workers API の設定とバインディング
const stocklyApiWorker = new cloudflare.WorkersScript("stockly-api", {
    accountId: accountId,
    name: "stockly-api-worker",
    content: "...worker bundle content...",
    compatibilityDate: "2024-09-23",
    compatibilityFlags: ["nodejs_compat"],
    d1DatabaseBindings: [{
        name: "DB",
        databaseId: stocklyDb.id,
    }],
    r2BucketBindings: [{
        name: "IMAGES_BUCKET",
        bucketName: stocklyImagesBucket.name,
    }],
    kvNamespaceBindings: [{
        name: "KV",
        namespaceId: stocklyKv.id,
    }],
    // Workers AI のバインディング設定
    ai: {
        name: "AI",
    },
});

// 出力エクスポート
export const d1DatabaseId = stocklyDb.id;
export const r2BucketName = stocklyImagesBucket.name;
export const kvNamespaceId = stocklyKv.id;
```

---

## 3. 環境分離戦略 (Stacks)

Pulumi のスタック機能を利用し、開発・本番環境を分離します。

- `Pulumi.dev.yaml`:
  - 開発用 Cloudflare リソース（またはローカル Miniflare / Wrangler エミュレーション併用）
- `Pulumi.prod.yaml`:
  - 本番用 Cloudflare リソース、本番ドメイン設定
