# 本番リリース後トラブルシューティングと事前防止分析 (Post-Release Troubleshooting & Lessons Learned)

本ドキュメントは、**Stockly** の Milestone 1 本番リリース直後（2026年10月）に発生した障害・不具合の事象、根本原因、解決策、および「なぜ事前に防げなかったのか」「次回以降どのように事前防止するか」の教訓と分析を記録したものです。

---

## 1. 発生した問題と解決策の全容

### 問題1: Cloudflare Access ON 下でのログイン後の画面遷移・認証不全

- **事象**:
  - Cloudflare Access を ON（ワンタイム PIN 認証保護）にした状態で画面右上の「ログイン」ボタンを押すと、トップ画面が再度表示されるだけでログイン状態にならない。
- **根本原因**:
  - `auth.ts` の `login()` が `/auth/login`（バックエンド独自 API）へ直接リダイレクトしていたが、Cloudflare Access 配下ではエッジが `CF_Authorization` クッキーでユーザーを認証・保護するため、アプリ側の独自認証セッションとライフサイクルが分離していた。
  - フロントエンドが起動時にエッジから渡される Access 認証情報（`cf-access-authenticated-user-email` ヘッダー）を拾って自動ログイン状態へ遷移する仕組みが不足していた。
- **実施した解決策**:
  - バックエンドの `/api/auth/me` で Cloudflare Access のヘッダー `cf-access-authenticated-user-email` を読み取り、有効なメールアドレスであれば自動的にセッションユーザーとして認識する連携を実装。
  - フロントエンド側でも起動時にセッションを確認し、Access 配下ではログイン操作なしで自動的に認証済み（メールアドレス表示）となるよう改善。
  - メールアドレス等の機密情報が公開リポジトリへ漏洩しないよう、`.env`（`ALLOWED_EMAIL`）で一元管理するセキュリティ規約を徹底。

---

### 問題2: キーワード検索時の「ストック取得失敗」エラー（過剰リクエスト & HTTP 429）

- **事象**:
  - ログイン後にキーワード検索を行うと、「ストックの取得に失敗しました」というエラーバナーが頻発して表示される。Cloudflare Access を OFF にしても再現。
- **根本原因**:
  - **Svelte 5 `$effect` の過剰反応**:
    - `App.svelte` の `$effect` 内で `stocksState.fetchStocks(query, tag)` を直接呼び出していた。
    - Svelte 5 の Runes は依存状態（`activeTab`, `searchQuery`, `selectedTag`）のわずかな変更や内部再評価に極めて敏感に反応するため、検索欄に 1 文字入力するだけでバックグラウンドで 5〜6 回以上の HTTP GET リクエストが API へ連打されていた。
  - **Cloudflare Free プランのエッジレートリミット (HTTP 429 Too Many Requests)**:
    - ローカル開発環境では無制限にリクエストを処理できたが、Cloudflare Workers のエッジネットワークでは短時間の API 連打に対して即座に `HTTP 429`（Too Many Requests）のスロットリングが発動。API 呼び出しが拒否され、フロントエンドがエラーバナーを表示していた。
- **実施した解決策**:
  - **ライフサイクルの明示化**:
    - `$effect` による暗黙的な自動 API 呼び出しを撤廃。初期化時は `onMount` で 1 回のみ全件取得し、以降はユーザー操作（入力・タグ選択）の明示的なイベント駆動に変更。
  - **ローカルファースト即時フィルタリング (0ms Client Filtering)**:
    - メモリ内に全ストックのマスターキャッシュ（`allStocks`）を保持。検索欄への入力時はサーバーへの通信を待たず、メモリ上で 0ms 即時でインクリメンタルフィルタリングを実行。
  - **耐障害性（フォールバック）の強化**:
    - バックグラウンド同期で万が一 429 スロットリングやネットワーク瞬断が発生しても、ローカルキャッシュによる検索結果表示を維持し、ユーザーに不要なエラーバナーを出さない堅牢な設計へ刷新。

---

### 問題3: PWA (Service Worker) キャッシュ残留によるスマホ実機でのバグ継続

- **事象**:
  - PC ブラウザでは修正が反映されて正常に動くようになったが、スマートフォン実機（Pixel 9 Pro）では、画面の引っ張り更新（Pull-to-refresh）や再読み込みを行っても検索エラーが継続して発生。
- **根本原因**:
  - **CacheStorage の強固な保持**:
    - PWA（`vite-plugin-pwa`）の Service Worker が、旧バージョンの `index.html` と JavaScript バンドル（`index-CWGQOcIk.js` 等）を端末内の `CacheStorage` に強固に保持していた。
    - 通常のブラウザ更新操作では Service Worker がバイパスされず、スマホ上ではバグ修正前の旧コード（`$effect` 連打版）が実行され続けて 429 エラーを引き起こしていた。
  - **パージ手段の不在**:
    - アプリ内にキャッシュを強制破棄して最新版に切り替える「非常口」が存在しなかった。
- **実施した解決策**:
  - **ワンタップ強制キャッシュクリア機構の実装**:
    - ヘッダー右上およびエラーバナー内に「🔄（キャッシュクリア＆最新版取得）」ボタンを配置。
    - タップ時にブラウザ内の全 Service Worker を登録解除（`unregister`）し、`caches.delete()` で全 CacheStorage を完全消去した上でハードリロードする `forceClearCacheAndReload` を実装。
  - **Service Worker 更新の自動検知**:
    - `navigator.serviceWorker.addEventListener("controllerchange", ...)` を設定し、新しい Service Worker がアクティブになった際に自動で画面をリフレッシュするライフサイクルを整備。

---

### 問題4: E2E テスト不在とローカル・本番環境のギャップ

- **事象**:
  - 単体テスト（Vitest）やローカル開発サーバー（`vp dev`）では通信速度やレートリミットの概念がなく、本番デプロイ後に初めて重大な挙動不全が発覚した。
- **実施した解決策**:
  - **Playwright による 2 系統の E2E テスト環境の構築**:
    - `test:e2e:local`: ローカル開発サーバー（フロント 5173 + API 8787）を自動起動し、ストック作成・検索・削除・統計タブ遷移のフルサイクルを自動検証。
    - `test:e2e:prod`: 本番ドメイン（`https://stockly.ohchans.com`）に対して実際のネットワーク通信を伴う自動検証を実施。
  - **高速入力耐性テストの標準化**:
    - 人間やスクリプトによる高速タイピング（短時間連続入力）を行っても、API 連打や 429 エラーを起こさず、正しくフィルタリングされることをテストコード（`tests/e2e/prod.spec.ts`）で自動保証。

---

### 問題5: Cloudflare Bot Fight Mode (WAF) による CI 上のブラウザ内 POST 遮断

- **事象**:
  - GitHub Actions 上で Headless Chromium を起動し、本番サイト（`https://stockly.ohchans.com`）の UI からストック作成フォームを入力・送信（ブラウザ内 `fetch` による `POST /api/stocks`）すると、Cloudflare WAF が HTTP 403（`Just a moment...` の JavaScript チャレンジ）を返し、テストがタイムアウト失敗する。
  - `User-Agent` や `navigator.webdriver` を偽装しても回避できず、Cloudflare Access の Service Token をヘッダー・Cookie で渡しても WAF の Bot Challenge が先に発動した。
- **根本原因**:
  - **データセンター IP × ヘッドレスブラウザの指紋検知**:
    - GitHub Actions ランナー（Azure データセンター IP）からのトラフィックに対し、Cloudflare の Bot Fight Mode が TCP/TLS 指紋、HTTP/2 設定、JavaScript 実行挙動を総合評価して自動化ボットと判定。
  - **Playwright APIRequestContext と Headless Browser の挙動差**:
    - 通常の Node.js `fetch`（OpenSSL スタック）やヘッドレスブラウザのスクリプト実行はボット判定されやすい一方、Playwright の `request.newContext()`（Chromium 内蔵 BoringSSL スタック）は Chrome ブラウザと完全に一致する TLS 指紋（Cipher Suites, TLS Extensions）を持つため、WAF の Bot Fight Mode を自然に透過できる。
- **実施した解決策**:
  - **テストヘルパー分離と透過プロキシアーキテクチャ (`cf-proxy.ts`)**:
    - ブラウザが送信する API リクエスト（`/api/*`）を Playwright の `page.route` でインターセプト。
    - リクエストを Playwright の `request.newContext()`（BoringSSL ベース）経由で本番 API へ中継し、Service Token（`CF-Access-Client-Id` / `Secret`）および認証 Cookie を付与。
    - テストコード本体（`prod.spec.ts`）からは認証やプロキシの記述を一切排除し、**「ボタンクリック」「モーダル入力」「検索」「タブ遷移」「削除ボタン操作」という純粋な実ブラウザ DOM 操作** のみで完結する設計を実現。

---

### 問題6: GitHub Actions if 条件式での secrets 参照エラー (`Unrecognized named-value: 'secrets'`)

- **事象**:
  - `.github/workflows/ci.yml` のステップ `if:` 条件式に `${{ secrets.CF_ACCESS_CLIENT_ID != '' }}` と記述したところ、IDE の GitHub Actions Linter および Actions ランナーで以下の構文エラーが発生：
    - `Unrecognized named-value: 'secrets'`
    - `Unexpected symbol: '${{'. Located at position 1 within expression`
- **根本原因**:
  - **二重波括弧の構文違反**: GitHub Actions の `if:` 条件式はそれ自体が式コンテキスト（Expression Context）として暗黙的に評価されるため、`${{ ... }}` で囲むと構文エラーになる。
  - **secrets コンテキストのスコープ制限**: セキュリティ上の仕様により、ステップの `if:` 式から `secrets` コンテキストを直接参照することは禁止されている（意図しないシークレットの流出や条件分岐の漏洩を防止するため）。
- **実施した解決策**:
  - **ジョブレベル `env:` への安全なマッピング**:
    - ジョブレベルの `env:` セクションで `${{ secrets.CF_ACCESS_CLIENT_ID }}` を環境変数にマッピング。
    - ステップの `if:` 条件式内では `env.CF_ACCESS_CLIENT_ID != ''` のように `env` コンテキスト経由で参照・判定する公式ベストプラクティスを適用。

---

### 問題7: E2E テストの実行時間遅延と Playwright ブラウザ・OS 依存キャッシュ

- **事象**:
  - CI パイプライン内で Playwright を実行する際、毎回の Chromium バイナリ（約 150MB）ダウンロードと OS 依存パッケージ（`apt install`）に 40〜50 秒以上を消費し、CI/CD 全体の実行速度を圧迫していた。
- **根本原因**:
  - GitHub Actions ランナーは使い捨て仮想マシンのため、Playwright のインストール先（`~/.cache/ms-playwright`）がキャッシュされていなかった。
  - さらに `install-deps` もキャッシュヒットの有無に関わらず無条件で実行されていた。
- **実施した解決策**:
  - **ブラウザバイナリと OS 依存パッケージの二層キャッシュ最適化**:
    - `actions/cache@v6` で `~/.cache/ms-playwright` を `pnpm-lock.yaml` のハッシュ値でキャッシュ。
    - `if: steps.playwright-cache.outputs.cache-hit != 'true'` を付与し、キャッシュヒット時は `playwright install chromium` のダウンロードおよび `install-deps` の apt 処理を完全にスキップ。
  - **パイプラインの二層化（CI/CD vs 日次 E2E）**:
    - デプロイ直後の CI/CD（`ci.yml`）では実ブラウザ起動を省き、Playwright APIRequestContext を用いた超高速 Health API & D1 Read 検証（`scripts/verify-health.mjs`）で **約 300ms** で健全性確認を完了（CI/CD 全体で約 1 分）。
    - 重い実ブラウザ DOM 操作 E2E は日次定期実行（`e2e-daily.yml`）に分離し、キャッシュ活用により **約 35 秒** で全件パスする高速パイプラインを確立。

---

## 2. なぜ事前に防げなかったのか（要因分析）

| 失敗・課題の分類           | 根本要因                                                                                     | なぜ事前に気付けなかったか                                                                                                               |
| :------------------------- | :------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **リアクティビティ設計**   | Svelte 5 の `$effect` に外部ネットワーク通信（API呼び出し）を直書きした                      | ローカル環境ではリクエストが瞬時に終わり、呼び出し回数の爆発やエッジレートリミット（429）が発生しなかったため                            |
| **エッジインフラへの理解** | Cloudflare Workers / Free プランのレートリミット特性を考慮していなかった                     | モックテストやローカル Miniflare では 429 スロットリングがシミュレートされていなかったため                                               |
| **PWA キャッシュ戦略**     | PWA を導入したものの「キャッシュの更新・破棄ライフサイクル」の設計が後回しになっていた       | PC ブラウザの開発者ツールで「キャッシュの無効化（Disable cache）」を有効にして開発していたため、実機の CacheStorage 残留問題を見落とした |
| **テストピラミッドの偏り** | 単体テスト（Vitest）のみに依存し、実ブラウザによる結合・E2E テストがなかった                 | ブラウザのレンダリング、キー入力イベント、実際の HTTP 通信、Service Worker が連動したテストを実施していなかったため                      |
| **エッジ WAF / TLS 指紋**  | データセンター IP からのブラウザ自動化通信に対する Bot Fight Mode (403) を考慮していなかった | ローカル PC（住宅用 ISP）からの通信では Bot Fight Mode の厳格なチャレンジがトリガーされなかったため                                      |
| **GitHub Actions 構文**    | `if:` 条件式内で `secrets` コンテキストが直接参照できない仕様を認識していなかった            | 通常の `env:` や `run:` での `${{ secrets... }}` の感覚で `if:` に記述してしまったため                                                   |

---

## 3. 次回以降に事前防止するための原則

1. **副作用（API 通信）の `$effect` 直書きを原則禁止する**:
   - 状態変化に伴うネットワークリクエストは、原則として「ユーザー操作イベント（UI イベントハンドラ）」または「明示的なライフサイクル（`onMount`）」で行う。
   - インクリメンタル検索などの連続入力が想定される UI では、最初から**「全件取得＋ローカル即時フィルタリング」**、または**「300ms 以上のデバウンス処理」**をアーキテクチャの必須要件とする。
2. **すべてのネットワーク API を「429 / オフライン耐性」前提で設計する**:
   - エッジ環境（Cloudflare 等）では短時間の連打で容易に 429 が返ることを前提とする。
   - クライアント側でマスターキャッシュを保持し、通信失敗時も画面表示を壊さないフォールバック機構を最初から実装する。
3. **PWA 導入アプリには「強制キャッシュクリア機構」を Day 1 で常設する**:
   - Service Worker を導入した瞬間から、実機でのキャッシュトラブルは不可避となる。
   - アプリの初期実装段階で、ワンタップで Service Worker と CacheStorage を全消去して最新版を取得できる仕組み（および `controllerchange` リロードハンドラ）を必須要件とする。
4. **本番デプロイ検証は「軽量 Health & DB Read」と「実ブラウザ E2E」の二層で構築する**:
   - デプロイ直後は軽量・高速（~300ms）な D1 読み込みヘルスチェックで即座にデプロイ成否を判定する。
   - 実ブラウザ E2E は別ジョブまたは日次定期実行とし、WAF / Bot Challenge 耐性を持つヘルパー（`cf-proxy.ts`）を介して純粋な DOM 操作を検証する。
5. **GitHub Actions の `if:` 式では常に `env:` 経由でシークレットを評価する**:
   - `secrets` コンテキストを `if:` に直書きせず、ジョブの `env:` にマッピングした上で `if: env.KEY != ''` で判定する。
6. **CI 上の Playwright はバイナリと OS 依存パッケージを両方キャッシュする**:
   - `~/.cache/ms-playwright` のキャッシュヒット判定により、バイナリダウンロードと `install-deps` の両方をスキップし、セットアップ時間を 0 秒化する。
