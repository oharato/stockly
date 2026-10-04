---
name: cloudflare-fullstack-pitfalls
description: >-
  Essential pitfalls, architecture patterns, and battle-tested runbooks for building
  fullstack web applications on Cloudflare (Workers, D1, R2, Zero Trust Access, Workers AI)
  with SPA/PWA frontends (Svelte, React, Vue) and GitHub Actions CI/CD. Use when designing,
  building, testing, or debugging Cloudflare fullstack apps to avoid edge rate limiting (HTTP 429),
  WAF Bot Fight Mode blocking in CI, PWA Service Worker cache trapping, D1 test mock divergence,
  and GitHub Actions secrets evaluation syntax errors.
---

# Cloudflare Fullstack App Pitfalls & Battle-Tested Patterns

Cloudflare のサーバーレス/エッジ基盤（Workers, D1, R2, Zero Trust Access）と SPA/PWA フロントエンド、および GitHub Actions CI/CD を組み合わせてフルスタック Web アプリケーションを開発する際に、**実際に本番環境で発生しやすい落とし穴（Pitfalls）と、それを Day 1 から事前防止するための標準アーキテクチャ・解決パターン集** です。

---

## 1. リアクティビティ & エッジレートリミット (HTTP 429)

### 🚨 落とし穴: `$effect` / `useEffect` 内での API 連打とエッジスロットリング

- **事象**: ローカル環境（Miniflare）では問題なく動いていたのに、本番公開後に検索欄を入力したりタブを切り替えると「取得に失敗しました」等のエラーが頻発する。
- **原因**:
  1. **リアクティビティの過剰反応**: Svelte 5 の `$effect` や React の `useEffect` 内に外部通信（API 呼び出し）を記述すると、関連ステート（検索文字、アクティブタブ、選択タグ等）のわずかな変更や内部再評価で意図しないカスケード（連鎖発火）が発生し、1文字入力ごとに 5〜6 回以上の GET リクエストが API に連打される。
  2. **Cloudflare Free プランのエッジレートリミット**: Cloudflare Workers のエッジネットワークは、短時間の急激な連続リクエストに対して即座に `HTTP 429 (Too Many Requests)` のスロットリングを発動する。

### 🛡️ 解決パターン

1. **副作用（API 通信）の `$effect` 直書きを原則禁止**:
   - ネットワークリクエストは、原則として **「ユーザー操作のイベントハンドラ（`oninput`, `onclick` 等）」** または **「明示的なマウント時ライフサイクル（`onMount`）」** のみに限定する。
2. **インクリメンタル検索のローカルファースト原則 (0ms Client Filtering)**:
   - 全件データ（数十〜数百件程度）をアプリ起動時に 1 回だけ取得してメモリ内マスターキャッシュ（`allStocks`）に保持。
   - ユーザー入力時はサーバーへリクエストを飛ばさず、メモリ上で 0ms 即時インクリメンタルフィルタリングを実行する。
3. **HTTP 429 & オフライン耐性のフォールバック設計**:
   - 万が一バックグラウンド同期で 429 スロットリングやネットワーク瞬断が発生しても、ローカルキャッシュによる画面表示を維持し、ユーザーに過剰なエラーバナーを出さない堅牢な設計とする。

---

## 2. PWA (Service Worker) ライフサイクル & キャッシュトラップ

### 🚨 落とし穴: スマホ実機での旧バグコード永続化

- **事象**: PC ブラウザではバグ修正が反映されているのに、スマートフォン実機（PWA ホーム画面起動）では引っ張り更新や再起動を行っても旧コードが動き続け、エラーが解消されない。
- **原因**:
  1. PWA（`vite-plugin-pwa` 等）の Service Worker が、旧バージョンの `index.html` や JavaScript バンドルを端末内の `CacheStorage` に強固に保持する。
  2. 開発者が PC ブラウザの開発者ツールで「Disable cache（キャッシュ無効化）」を有効にして開発しているため、実機の CacheStorage 残留問題に気付けない。
  3. アプリ内にキャッシュを強制消去して最新版に切り替える手段がない。

### 🛡️ 解決パターン

1. **ワンタップ強制キャッシュクリア機構を Day 1 で常設**:
   - ヘッダー右上やエラー表示内に、ワンタップで全 Service Worker 登録解除（`unregister`）と CacheStorage 完全消去（`caches.delete`）を行う更新機能を常設する。
   ```typescript
   export async function forceClearCacheAndReload(): Promise<void> {
     try {
       if ("serviceWorker" in navigator) {
         const registrations = await navigator.serviceWorker.getRegistrations();
         for (const reg of registrations) {
           await reg.unregister();
         }
       }
       if ("caches" in window) {
         const keys = await caches.keys();
         for (const key of keys) {
           await caches.delete(key);
         }
       }
     } finally {
       window.location.reload();
     }
   }
   ```
2. **Service Worker 更新の自動検知**:
   - `navigator.serviceWorker.addEventListener("controllerchange", ...)` を登録し、新しい Service Worker がアクティブになった際に安全に自動リロードされるようにする。

---

## 3. Cloudflare WAF (Bot Fight Mode) & ヘッドレスブラウザ E2E

### 🚨 落とし穴: CI ランナー（データセンター IP）からのブラウザ内 POST が 403 で全滅する

- **事象**: GitHub Actions 上で Headless Chromium を起動し、本番サイトからフォーム入力・作成（ブラウザ内 `fetch` による `POST /api/*`）を実行すると、Cloudflare WAF が HTTP 403（`Just a moment...` の JavaScript チャレンジ）を返してテストがタイムアウト失敗する。`User-Agent` や `navigator.webdriver` を偽装しても回避できない。
- **原因**:
  - Cloudflare の **Bot Fight Mode (WAF)** は、データセンター IP（GitHub Actions / AWS / Azure 等）からのブラウザ自動化通信を TCP/TLS 指紋・HTTP/2 設定・JavaScript 挙動から高精度に検知してブロックする。
  - 一方、Playwright の `request.newContext()`（APIRequestContext）は Chromium 内蔵の BoringSSL スタックを使用しており、実 Chrome ブラウザと同一の TLS 指紋（Cipher Suites, TLS Extensions）を持つため、WAF チャレンジを自然に透過できる。

### 🛡️ 解決パターン: 透過プロキシヘルパー (`cf-proxy.ts`)

- テスト実行時、ブラウザの `/api/*` リクエストを Playwright の `page.route` でインターセプト。
- リクエストを Playwright の `request.newContext()`（BoringSSL ベース）経由で本番 API へ中継し、Cloudflare Access の Service Token や認証 Cookie を付与。
- **テストコード本体 (`prod.spec.ts`) は一切のプロキシ・認証記述を排除し、純粋なブラウザ DOM 操作（ボタンクリック、モーダル入力、検索、タブ遷移、削除）に専念させる**。

```typescript
// tests/e2e/helpers/cf-proxy.ts
import { type Page, request } from "@playwright/test";

export async function setupCloudflareProxy(page: Page, origin: string) {
  const clientId = process.env.CF_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return;

  const apiContext = await request.newContext({
    baseURL: origin,
    extraHTTPHeaders: {
      "CF-Access-Client-Id": clientId,
      "CF-Access-Client-Secret": clientSecret,
      "X-Stockly-User-Id": "e2e-test", // テストユーザーデータ分離
    },
  });

  await page.route(`${origin}/api/**`, async (route) => {
    const req = route.request();
    const response = await apiContext.fetch(req.url(), {
      method: req.method(),
      headers: req.headers(),
      data: req.postDataBuffer() || undefined,
    });
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: await response.body(),
    });
  });
}
```

---

## 4. Cloudflare D1 テスト基盤: 手書きモックの限界と本物 SQLite 活用

### 🚨 落とし穴: クエリ文字列判定手書きモックの保守破綻

- **事象**: D1 のモックを SQL 文字列の `query.includes(...)` で自作すると、カラム追加・JOIN・WHERE 句の変更のたびにモック側の文字列判定の修正に追われる。さらに、外部キー制約（Foreign Key）を無視するため、不正なリレーションをパスしてしまう。
- **エコシステムの現状**:
  - `@cloudflare/vitest-plugin`: Vite+ 内蔵 Vitest 5 とのバージョン依存不整合が起きる場合がある。
  - `miniflare`: Node.js 24 環境で同期通信デッドロックが発生する場合がある。

### 🛡️ 解決パターン: Node.js LTS 組み込み `node:sqlite` によるインメモリ D1

- Node.js LTS (v24.13.0+) 組み込みの `DatabaseSync(':memory:')` を活用。
- 外部依存パッケージゼロ、起動 1 秒台で全テストが走る。
- `migrations/*.sql` を昇順で自動適用し、`PRAGMA foreign_keys = ON;` で本物の SQLite 制約を 100% 検証。

```typescript
// apps/api/test/helpers/mock-db.ts
import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";

export function createTestD1Database(): D1Database {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  // migrations/*.sql を自動昇順ロード
  const migrationsDir = path.resolve(__dirname, "../../migrations");
  if (fs.existsSync(migrationsDir)) {
    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const sqlFile of sqlFiles) {
      db.exec(fs.readFileSync(path.join(migrationsDir, sqlFile), "utf-8"));
    }
  }

  // D1Database 互換ラッパーを返却
  return {
    prepare(query: string) {
      return {
        bind(...values: any[]) {
          /* db.prepare(query) を実行するラッパー */
        },
      };
    },
    batch(statements: any[]) {
      /* トランザクション実行ラッパー */
    },
  } as unknown as D1Database;
}
```

---

## 5. GitHub Actions CI/CD: 構文制約 & キャッシュ高速化

### 🚨 落とし穴: `if:` 条件式での secrets 参照エラー

- **事象**:
  `if: ${{ secrets.CF_ACCESS_CLIENT_ID != '' }}` と記述すると、以下のエラーが発生する：
  - `Unrecognized named-value: 'secrets'`
  - `Unexpected symbol: '${{'. Located at position 1 within expression`
- **原因**:
  - `if:` 式は暗黙的に式コンテキストとして解釈されるため `${{ ... }}` を書いてはならない。
  - セキュリティ制約上、ステップの `if:` 式から `secrets` コンテキストを直接参照することは禁止されている。

### 🛡️ 解決パターン: ジョブレベル `env:` へのマッピング

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      CF_ACCESS_CLIENT_ID: ${{ secrets.CF_ACCESS_CLIENT_ID }}
    steps:
      - name: Conditional Step
        if: env.CF_ACCESS_CLIENT_ID != ''
        run: ...
```

---

### 🛡️ パイプライン二層化 & Playwright 完全キャッシュ設計

1. **二層パイプライン構成**:
   - **Layer 1: デプロイ直後検証 (`ci.yml`)**:
     - 実ブラウザを起動せず、Playwright APIRequestContext による軽量スクリプト（`scripts/verify-health.mjs`）で `GET /api/health`（D1 `SELECT COUNT(*) FROM stocks`）を実行。
     - **約 300ms**（CI 全体で約 1 分）でデプロイ＋DB 読み込み健全性を即時判定。
   - **Layer 2: 日次本番 E2E 監視 (`e2e-daily.yml`)**:
     - 毎朝 09:00 JST / 手動トリガーで、本番環境に対する純粋な DOM 操作 E2E を実行。
2. **Playwright 完全キャッシュ規約**:
   - ブラウザバイナリ（`~/.cache/ms-playwright`）を `pnpm-lock.yaml` ハッシュでキャッシュ。
   - **`install-deps` もキャッシュヒット時は条件付きスキップ**（`if: steps.cache.outputs.cache-hit != 'true'`）。
   - これにより、Playwright セットアップ時間が **0 秒**、E2E ジョブ全体が **約 35 秒** で完了する。

---

## 6. ライブラリ選定 & バージョン互換性の落とし穴

フルスタック Cloudflare 開発において、開発速度・バンドルサイズ・CI 速度を最大化し、依存関係の衝突を防ぐためのライブラリ選定と互換性知見です。

### 🚨 落とし穴1: `@cloudflare/vitest-plugin` / `miniflare` と最新ツールのバージョン衝突

- **事象**:
  - Cloudflare 公式の最新推奨テストツール `@cloudflare/vitest-plugin` を Vite+ (`vite-plus` / `vp test`) 環境に導入すると、Vite+ が内蔵する `vitest@5.x` に対しプラグインが `vitest@^4.1.0` を前提としているため、ワーカープール起動時に内部 API 互換性エラー（`Unexpected identifier 'file'`）が発生する。
  - `miniflare` スタンドアローン版を Node.js 24 で動かすと、スレッド間同期通信（`Atomics.wait`）がデッドロックする。
- **🛡️ 解決策**:
  - **Node.js LTS (v24.13.0+) 組み込み `node:sqlite`（`DatabaseSync`）を採用**:
    - 外部ライブラリ依存ゼロで、起動オーバーヘッド 0ms。
    - 公式プラグインが Vitest 5 追従を完了するまでの間、最も堅牢で高速なテスト環境を提供。

### 🚨 落とし穴2: 個別ツールの乱立による設定・依存の断片化

- **事象**: ESLint, Prettier, 独立した Vitest, Turborepo, tsdown などを個別に導入すると、設定ファイルの増大、依存パッケージの競合、CI でのセットアップ時間増大を招く。
- **🛡️ 解決策**:
  - **統合ツールチェーン Vite+ (`vp`) の徹底活用**:
    - 単一のツールチェーンで Rust 製高速ツール群（Rolldown, Vitest, Oxlint, Oxfmt, tsdown）を包括。
    - `vp check`（型検査 + Oxlint + Oxfmt）、`vp test --run`、`vp build` を 1 つで高速完結させ、メンテナンスコストを劇的に削減。

### 🚨 落とし穴3: `wrangler` の分散と Zero Trust / Access 操作の分断

- **事象**: 従来の `wrangler` CLI では Workers, D1, R2 の基本操作しかできず、Zero Trust Access の Service Token 発行やポリシー制御はダッシュボードの手動操作や curl に頼る必要があった。
- **🛡️ 解決策**:
  - **Cloudflare 次世代統合 CLI `cf` (`cf@1.0.0-beta.12`) の全面採用**:
    - `cf dev`, `cf deploy`, `cf d1`, `cf zero-trust access service-tokens` など、インフラ・WAF・認証・アプリ操作を一元化。

### 🚨 落とし穴4: バックエンド・フロントエンド間の型共有でのランタイム汚染

- **事象**: モノレポで型を共有する際、バックエンドのモジュールを直接インポートすると、Node.js / Cloudflare 固有のランタイムコードや重い依存がフロントエンドのクライアントバンドルに混入・肥大化する。
- **🛡️ 解決策**:
  - **Hono RPC (`hono/client`) + Zod による Type-Only Import**:
    - バックエンド側で Zod スキーマから推論した `AppType` をエクスポート。
    - フロントエンド側は `import type { AppType } from '...'` で **型情報のみ** を参照し、`hc<AppType>('/')` でクライアントを生成。
    - クライアントバンドルへのオーバーヘッド **0 バイト** で、完全な E2E 型補完とバリデーションを実現。

### 🛡️ 推奨ライブラリスタック一覧

| 領域                        | 推奨ライブラリ / ツール             | 選定理由 & メリット                                                           |
| :-------------------------- | :---------------------------------- | :---------------------------------------------------------------------------- |
| **統合ツールチェーン**      | **Vite+ (`vite-plus` / `vp`)**      | Rolldown + Oxlint + Oxfmt + Vitest が統合された超高速 Rust 製スタック         |
| **Cloudflare CLI**          | **`cf` (`cf@1.0.0-beta.12`)**       | Workers, D1, R2, Zero Trust Access を一元操作する公式次世代 CLI               |
| **バックエンド API**        | **Hono + Cloudflare Workers**       | エッジ最適化された超軽量 Web フレームワーク + RPC 型安全性                    |
| **バリデーション / 型共有** | **Zod + `hono/client` (RPC)**       | Type-only import によりクライアントバンドルを汚染しない完全型安全通信         |
| **フロントエンド**          | **Svelte 5 (Runes) + Tailwind CSS** | `$state` / `$derived` による最小ランタイム。バンドルサイズ 70KB 台の超軽量 UI |
| **UI アイコン**             | **`lucide-svelte`**                 | 完全 Tree-shaking 対応で必要なアイコンのみバンドル                            |
| **PWA**                     | **`vite-plugin-pwa`**               | Workbox によるオフラインキャッシュと PWA マニフェスト生成                     |
| **インフラコード化 (IaC)**  | **Pulumi (`@pulumi/cloudflare`)**   | TypeScript で D1, R2, KV, DNS, Access をコード管理（HCL 不要）                |
| **D1 単体テスト**           | **`node:sqlite` (Node.js LTS)**     | 外部依存ゼロ、1秒で全件パスする本物 SQLite インメモリテスト                   |
| **E2E 自動テスト**          | **Playwright (`@playwright/test`)** | BoringSSL スタックにより Cloudflare WAF Bot Challenge を透過可能な唯一解      |

---

## 7. まとめ: チェックリスト (Day 1 導入原則)

- [ ] **Svelte / React**: `$effect` / `useEffect` 内で API 通信を行っていないか？
- [ ] **検索 UI**: マスターキャッシュによる「0ms 即時ローカルフィルタ」または「300ms デバウンス」になっているか？
- [ ] **PWA**: ワンタップで `unregister` + `caches.delete` を行う強制パージ機構を常設したか？
- [ ] **E2E**: データセンター IP からの WAF 遮断に備え、BoringSSL 経由の透過プロキシ（`cf-proxy.ts`）を用意したか？
- [ ] **E2E データ分離**: テストリクエストに `user_id: 'e2e-test'` を注入し、本番実データを保護しているか？
- [ ] **D1 テスト**: 手書き文字列モックではなく、Node.js LTS 組み込み `node:sqlite` でマイグレーションを実行しているか？
- [ ] **型共有**: バックエンドから型情報のみ（`import type { AppType }`）を参照し、フロントバンドルを汚染していないか？
- [ ] **CLI 統合**: 従来の `wrangler` 乱立ではなく、`cf` CLI で Workers / Access / D1 を一元管理しているか？
- [ ] **GitHub Actions**: `if:` 式で `secrets` を直参照せず、ジョブレベル `env:` 経由で評価しているか？
- [ ] **CI キャッシュ**: Playwright の `install-deps` もキャッシュヒット判定でスキップしているか？
- [ ] **CD ヘルスチェック**: デプロイ直後に D1 の Read を伴うヘルスチェック（~300ms）を組み込んでいるか？
- [ ] **サプライチェーン**: レジストリ `https://npm.flatt.tech` を指定し、7日間クールダウンを満たす安定版にバージョン固定しているか？
