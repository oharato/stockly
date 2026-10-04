import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

// Auto-load .env
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
];
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {}
  }
}

/**
 * 本番 E2E テスト自動実行ランナー
 * - Cloudflare Access 常時保護下 (ON) のまま、Service Token を用いて安全にテストを実行します。
 * - セキュリティ保護のため、本番 Access を一時的にも OFF (Bypass) にすることはありません。
 */
function main() {
  console.log("🚀 [E2E Prod Runner] 本番環境 E2E テストの準備を開始します...");

  const clientId = process.env.CF_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("❌ [E2E Prod Runner] Cloudflare Access Service Token が設定されていません。");
    console.error("   本番環境は Cloudflare Access で保護されているため、E2E テストの実行には");
    console.error("   CF_ACCESS_CLIENT_ID および CF_ACCESS_CLIENT_SECRET が必須です。");
    console.error("   .env ファイルにこれらを設定してください。");
    process.exit(1);
  }

  console.log(
    "🔑 [E2E Prod Runner] Service Token が検出されました。Access ON (常時保護) のまま安全にテストを実行します。",
  );

  const result = spawnSync("pnpm", ["exec", "playwright", "test", "--project=prod"], {
    stdio: "inherit",
    env: { ...process.env, E2E_TARGET: "prod" },
  });

  process.exit(result.status ?? 0);
}

main();
