import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

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

const APP_DOMAIN = process.env.CLOUDFLARE_APP_DOMAIN || "stockly.ohchans.com";
const APP_NAME = "Stockly";
const OWNER_EMAIL = process.env.CLOUDFLARE_ACCESS_EMAIL;

interface AccessPolicy {
  id?: string;
  name: string;
  decision: "allow" | "bypass" | "deny" | "non_identity";
  include: Array<Record<string, unknown>>;
  precedence?: number;
}

interface AccessApp {
  id: string;
  name: string;
  domain: string;
  policies?: AccessPolicy[];
}

/**
 * Cloudflare CLI (`cf`) を呼び出して JSON 結果をパースする
 */
function runCf(args: string[]): any {
  try {
    const stdout = execFileSync("pnpm", ["exec", "cf", ...args], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const braceIdx = stdout.indexOf("{");
    const bracketIdx = stdout.indexOf("[");
    const indices = [braceIdx, bracketIdx].filter((i) => i >= 0);
    if (indices.length === 0) return null;

    const startIdx = Math.min(...indices);
    return JSON.parse(stdout.slice(startIdx));
  } catch (err: any) {
    const errorText = `${err.stdout || ""} ${err.stderr || ""} ${err.message || ""}`;
    if (
      errorText.includes("403 Forbidden") ||
      errorText.includes("1010") ||
      errorText.includes("10000")
    ) {
      console.error("\n⚠️  【Cloudflare API 権限不足エラー】");
      console.error(
        "現在お使いの Cloudflare API Token に Access (Zero Trust) の操作権限が含まれていません。",
      );
      console.error("Cloudflare ダッシュボードで以下の権限を追加してください:");
      console.error("  1. Cloudflare ダッシュボード ➔ My Profile (右上アイコン) ➔ API Tokens");
      console.error("  2. 使用中のトークンの「Edit」をクリック");
      console.error(
        "  3. Permissions (権限) に次を追加: Account ➔ Access: Apps and Policies ➔ Edit",
      );
      console.error("  4. 保存後、再度このコマンドを実行してください。\n");
      process.exit(1);
    }
    throw new Error(errorText);
  }
}

function getStocklyApp(): AccessApp | null {
  const apps = runCf(["zero-trust", "access", "applications", "list"]);
  if (!Array.isArray(apps)) return null;
  return apps.find((a: AccessApp) => a.domain === APP_DOMAIN || a.name === APP_NAME) ?? null;
}

function getAppDetails(appId: string): AccessApp {
  return runCf(["zero-trust", "access", "applications", "get", appId]);
}

function showStatus() {
  console.log(`\n🔍 Cloudflare Access 状態確認 (cf CLI): ${APP_DOMAIN}`);
  const app = getStocklyApp();
  if (!app) {
    console.log("ℹ️  Access Application はまだ作成されていません。");
    console.log(`   'pnpm run access:on' を実行すると cf CLI 経由で新規作成されます。\n`);
    return;
  }

  const details = getAppDetails(app.id);

  console.log(`   ・アプリケーション名: ${details.name}`);
  console.log(`   ・ドメイン: ${details.domain}`);
  console.log(`   ・ID: ${details.id}`);
  console.log(`   ・セッション有効期限: ${(details as any).session_duration || "24h"}`);

  const policies = details.policies || [];
  const hasAllow = policies.some((p: AccessPolicy) => p.decision === "allow");
  const hasServiceToken = policies.some((p: AccessPolicy) => p.decision === "non_identity");
  const isBypass = policies.some((p: AccessPolicy) => p.decision === "bypass");

  if (isBypass) {
    console.log("🔓 【現在: OFF (Bypass)】 誰でも認証画面なしで直接アクセス可能です。");
  } else if (hasAllow) {
    console.log(
      `🔒 【現在: ON (Protected)】 ${OWNER_EMAIL || "管理者メールアドレス"} によるワンタイムPIN認証で保護されています。`,
    );
    if (hasServiceToken) {
      console.log("   🔑 Service Token による自動テスト認証 (non_identity) が有効です。");
    }
  } else {
    console.log(`ℹ️  【現在ポリシー数: ${policies.length}】`);
  }
  console.log("");
}

function setAccess(enable: boolean) {
  if (enable && !OWNER_EMAIL) {
    console.error("❌ CLOUDFLARE_ACCESS_EMAIL が .env に設定されていません。");
    console.error(
      "   .env に 'CLOUDFLARE_ACCESS_EMAIL=your-email@example.com' を追加してください。",
    );
    process.exit(1);
  }

  const app = getStocklyApp();

  const policies: AccessPolicy[] = [];

  if (enable) {
    policies.push({
      name: "Owner PIN Access",
      decision: "allow",
      include: [{ email: { email: OWNER_EMAIL } }],
      precedence: 1,
    });

    const serviceTokenId = process.env.CF_ACCESS_SERVICE_TOKEN_ID;
    if (serviceTokenId) {
      policies.push({
        name: "E2E Service Token Access",
        decision: "non_identity",
        include: [{ service_token: { token_id: serviceTokenId } }],
        precedence: 2,
      });
    }
  } else {
    policies.push({
      name: "Dev Bypass Access",
      decision: "bypass",
      include: [{ everyone: {} }],
      precedence: 1,
    });
  }

  const sessionDuration = process.env.CLOUDFLARE_ACCESS_SESSION_DURATION || "730h";
  const payload = {
    name: APP_NAME,
    domain: APP_DOMAIN,
    type: "self_hosted",
    session_duration: sessionDuration,
    policies,
  };

  if (!app) {
    console.log(`🚀 cf CLI で Access Application '${APP_NAME}' (${APP_DOMAIN}) を新規作成中...`);
    const newApp = runCf([
      "zero-trust",
      "access",
      "applications",
      "create",
      "--body",
      JSON.stringify(payload),
    ]);
    console.log(`✅ Access Application を作成しました (ID: ${newApp.id})`);
  } else {
    console.log(`🔄 cf CLI でアプリケーション '${app.name}' (ID: ${app.id}) のポリシーを更新中...`);
    runCf([
      "zero-trust",
      "access",
      "applications",
      "update",
      app.id,
      "--body",
      JSON.stringify(payload),
    ]);
  }

  if (enable) {
    console.log(`\n🔒 【Cloudflare Access: ON】 に切り替えました！`);
    console.log(`   URL: https://${APP_DOMAIN}`);
    console.log(`   許可アドレス: ${OWNER_EMAIL} (ワンタイムPIN認証)`);
  } else {
    console.log(`\n🔓 【Cloudflare Access: OFF (Bypass)】 に切り替えました！`);
    console.log(`   URL: https://${APP_DOMAIN}`);
    console.log(`   認証画面はスキップされ、誰でも直接アクセス可能です（開発・検証モード）。`);
  }
  console.log("");
}

function main() {
  const command = process.argv[2];
  try {
    if (command === "on") {
      setAccess(true);
    } else if (command === "off") {
      setAccess(false);
    } else if (command === "status" || !command) {
      showStatus();
    } else {
      console.log("使用方法 (cf CLI 連動):");
      console.log("  pnpm run access:status  - 現在の保護状態を確認");
      console.log("  pnpm run access:on      - 認証保護を有効化 (ON)");
      console.log("  pnpm run access:off     - 認証保護を解除 (OFF / Bypass)");
    }
  } catch (err: any) {
    console.error("❌ エラーが発生しました:", err.message);
    process.exit(1);
  }
}

main();
