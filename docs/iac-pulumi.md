# Pulumi による Cloudflare インフラ設計書 (IaC Specification)

本ドキュメントでは、**Pulumi (TypeScript)** を用いて Cloudflare 上のインフラリソース（D1, R2, KV, Workers）をコード化・自動プロビジョニングする方針を定義します。

---

## 1. Pulumi 構成方針

### 1.1 プロバイダー & パッケージ

- プロバイダー: `@pulumi/cloudflare` (最新安定版)
- ランタイム: TypeScript
- パッケージマネージャー: pnpm

### 1.2 管理対象リソース一覧

| リソース種別               | Pulumi リソース名                                      | 用途                                                     |
| -------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| **D1 Database**            | `cloudflare.D1Database`                                | ストック・ユーザー・統計等のメインSQLiteデータベース     |
| **R2 Bucket**              | `cloudflare.R2Bucket`                                  | ストックに添付される画像・写真ファイル保存               |
| **KV Namespace**           | `cloudflare.WorkersKvNamespace`                        | セッション、一時トークン、キャッシュ                     |
| **Workers Script**         | `cloudflare.WorkersScript`                             | バックエンド API (Hono) および Workers AI バインディング |
| **Pages Project / Worker** | `cloudflare.PagesProject` または Workers Static Assets | フロントエンド PWA のホスティング                        |
| **Custom Domain**          | `cloudflare.Record` / `cloudflare.WorkerDomain`        | カスタムドメインへのルーティング                         |

---

## 2. Pulumi 実装コード構成 (`infra/index.ts`)

Stockly では、ルートの `.env`（`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`）を自動検出し、Cloudflare Provider を通じて D1 データベースおよび R2 バケット（APAC リージョン）を自動プロビジョニングします。

```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

// .env 自動読み込み
const baseDir = import.meta.dirname ?? process.cwd();
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(baseDir, "../.env"),
  path.resolve(baseDir, ".env"),
];
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {}
  }
}

const config = new pulumi.Config();
const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? config.get("apiToken");
const accountId = config.get("accountId") ?? process.env.CLOUDFLARE_ACCOUNT_ID;

const provider = new cloudflare.Provider("cloudflare-provider", {
  apiToken: apiToken,
});

const environment = config.get("environment") ?? "prod";

// 1. Cloudflare D1 Database
export const d1Database = new cloudflare.D1Database(
  `stockly-db-${environment}`,
  {
    accountId: accountId as string,
    name: `stockly-db-${environment}`,
  },
  { provider },
);

// 2. Cloudflare R2 Bucket (APAC)
export const r2Bucket = new cloudflare.R2Bucket(
  `stockly-media-${environment}`,
  {
    accountId: accountId as string,
    name: `stockly-media-${environment}`,
    location: "apac",
  },
  { provider },
);

// Stack Outputs
export const outputs = {
  environment,
  d1DatabaseId: d1Database.id,
  d1DatabaseName: d1Database.name,
  r2BucketName: r2Bucket.name,
};
```

### 2.1 デプロイ & リソース作成コマンド

```bash
# インフラプロビジョニング (Pulumi 本番スタック)
pnpm run infra:up

# プロビジョニング結果の確認
pnpm run infra:preview
```

---

## 3. 環境分離戦略 (Stacks)

Pulumi のスタック機能を利用し、開発・本番環境を分離します。

- `Pulumi.dev.yaml`:
  - 開発用 Cloudflare リソース（またはローカル Miniflare / Wrangler エミュレーション併用）
- `Pulumi.prod.yaml`:
  - 本番用 Cloudflare リソース、本番ドメイン設定
