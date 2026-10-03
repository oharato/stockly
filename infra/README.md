# Stockly Infrastructure (Pulumi IaC)

Stockly の本番用 Cloudflare クラウドリソース（D1 データベース、R2 メディアバケット）をコード（TypeScript）でプロビジョニング・管理するための Pulumi IaC パッケージです。

---

## 🏗️ 管理リソース

- **Cloudflare D1**: `stockly-db-prod`（本番用 SQLite データベース）
- **Cloudflare R2**: `stockly-media-prod`（本番用画像・メディア添付バケット、APAC ロケーション）

---

## 🚀 初期セットアップ手順

### 1. 前提条件

- Cloudflare アカウントおよび API トークン
  - 必要な権限: `D1:Edit`, `R2:Edit`, `Workers Scripts:Edit`, `Account:Read`
- ローカル環境: `mise` により Node LTS、pnpm、Pulumi CLI (`v3.257.0`) がインストール済みであること

### 2. 環境変数設定 (`.env`) & Pulumi スタック初期化

認証情報はプロジェクトルートの `.env` で一元管理されます。`.mise.toml` によりシェルへ自動展開され、Pulumi やスクリプトからも自動読み込みされます。

```bash
# 1. ルートの .env.example から .env を作成し、実際の値を入力
cp .env.example .env
# エディタで .env を開き、CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID を設定

# 2. infra ディレクトリへ移動
cd infra

# 3. Pulumi ログイン (ローカルステートまたは Pulumi Cloud)
pulumi login --local

# 4. 本番スタックの作成
pulumi stack init prod
```

---

## 🛠️ プロビジョニング実行

```bash
# 変更内容の事前プレビュー
pulumi preview

# 本番リソースの作成・反映
pulumi up
```

デプロイ完了後、作成された D1 Database ID などの出力値が表示されます:

```bash
Outputs:
    d1DatabaseId  : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    d1DatabaseName: "stockly-db-prod"
    r2BucketName  : "stockly-media-prod"
```

---

## 📦 本番 D1 マイグレーション & CSV 移行

リソース作成後、本番 D1 データベースに対してスキーママイグレーションと過去データインポートを実行します。

### 1. スキーママイグレーション適用

```bash
cd apps/api
npx wrangler d1 migrations apply stockly-db-prod --remote
```

### 2. 過去データ（CSV）のインポート（一回限り）

```bash
# ルートディレクトリで実行
pnpm import:csv --remote --db stockly-db-prod
```

---

## 🌐 フロントエンド & バックエンドのデプロイ

### 1. API (Cloudflare Workers)

`apps/api/wrangler.jsonc` の本番環境設定（`env.production`）に、上記で作成された `database_id` を反映し、デプロイします:

```bash
pnpm --filter api run deploy
```

### 2. PWA Web アプリ (Cloudflare Pages)

```bash
pnpm --filter web run build
npx wrangler pages deploy apps/web/dist --project-name stockly-web
```
