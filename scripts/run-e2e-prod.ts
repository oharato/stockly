import * as fs from "node:fs";
import * as path from "node:path";
import { execSync, spawnSync } from "node:child_process";

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
 * - Service Token (CF_ACCESS_CLIENT_ID & CF_ACCESS_CLIENT_SECRET) があればそのまま実行
 * - なければ Cloudflare Access を一時的に Bypass (OFF) に切り替え、テスト完了後に必ず復元 (ON)
 */
function main() {
  console.log("🚀 [E2E Prod Runner] 本番環境 E2E テストの準備を開始します...");

  const hasServiceToken =
    Boolean(process.env.CF_ACCESS_CLIENT_ID) && Boolean(process.env.CF_ACCESS_CLIENT_SECRET);

  if (hasServiceToken) {
    console.log(
      "🔑 [E2E Prod Runner] Service Token が検出されました。Access ON のままテストを実行します。",
    );
    const result = spawnSync("pnpm", ["exec", "playwright", "test", "--project=prod"], {
      stdio: "inherit",
      env: { ...process.env, E2E_TARGET: "prod" },
    });
    process.exit(result.status ?? 0);
  }

  // 現在の Access ステータスを確認
  let initialStatusIsOn = false;
  try {
    const statusOut = execSync("node --experimental-strip-types scripts/access-toggle.ts status", {
      encoding: "utf-8",
    });
    initialStatusIsOn = statusOut.includes("ON (Protected)") || statusOut.includes("【現在: ON");
    console.log(
      `ℹ️ [E2E Prod Runner] 現在の Access 状態: ${initialStatusIsOn ? "ON (保護中)" : "OFF (Bypass)"}`,
    );
  } catch (err) {
    console.warn("⚠️ Access ステータスの取得に失敗しました。そのままテストを実行します:", err);
  }

  // クリーンアップ関数（必ず元の状態に戻す）
  let restored = false;
  const restoreAccess = () => {
    if (restored) return;
    restored = true;
    if (initialStatusIsOn) {
      console.log("\n🔒 [E2E Prod Runner] Access 保護を 【ON】 に復元しています...");
      try {
        execSync("node --experimental-strip-types scripts/access-toggle.ts on", {
          stdio: "inherit",
        });
        console.log("✅ [E2E Prod Runner] Access 保護が正常に復元されました。");
      } catch (err) {
        console.error("❌ [E2E Prod Runner] Access 保護の復元に失敗しました:", err);
      }
    }
  };

  // プロセス中断シグナルのハンドリング
  process.on("SIGINT", () => {
    restoreAccess();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    restoreAccess();
    process.exit(143);
  });

  try {
    if (initialStatusIsOn) {
      console.log(
        "🔓 [E2E Prod Runner] E2E テスト実行のため、一時的に Access を 【OFF (Bypass)】 に切り替えます...",
      );
      execSync("node --experimental-strip-types scripts/access-toggle.ts off", {
        stdio: "inherit",
      });
      // Cloudflare エッジへの設定伝播を確実に待機 (最大15秒ポーリング)
      console.log("⏳ [E2E Prod Runner] エッジへのポリシー反映を確認中...");
      let isReady = false;
      for (let i = 0; i < 15; i++) {
        try {
          const res = execSync(
            "curl -s -o /dev/null -w '%{http_code}' https://stockly.ohchans.com",
            {
              encoding: "utf-8",
            },
          ).trim();
          if (res === "200") {
            isReady = true;
            console.log(`✅ [E2E Prod Runner] エッジ反映確認完了 (${i + 1}s: HTTP 200 OK)`);
            break;
          }
        } catch {
          // ignore
        }
        spawnSync("sleep", ["1"]);
      }
      if (!isReady) {
        console.warn("⚠️ エッジ反映が完了していない可能性がありますがテストを続行します");
      }
    }

    console.log("🧪 [E2E Prod Runner] 本番 E2E テストを実行します...");
    const testResult = spawnSync("pnpm", ["exec", "playwright", "test", "--project=prod"], {
      stdio: "inherit",
      env: { ...process.env, E2E_TARGET: "prod" },
    });

    restoreAccess();
    process.exit(testResult.status ?? 0);
  } catch (err) {
    console.error("❌ [E2E Prod Runner] テスト実行中にエラーが発生しました:", err);
    restoreAccess();
    process.exit(1);
  }
}

main();
