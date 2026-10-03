import * as fs from "node:fs";
import * as path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

// Auto-load .env from root or current directory if present
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, ".env"),
];
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {
      // Ignore parse errors, let env vars or pulumi config take precedence
    }
  }
}

const config = new pulumi.Config();

const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? config.get("apiToken");
const accountId = config.get("accountId") ?? process.env.CLOUDFLARE_ACCOUNT_ID;

if (!accountId) {
  void pulumi.log.warn(
    "Cloudflare accountId is not set. Please set CLOUDFLARE_ACCOUNT_ID in .env or via 'pulumi config set accountId <id>'",
  );
}

// Explicit Cloudflare Provider using .env credentials
const provider = new cloudflare.Provider("cloudflare-provider", {
  apiToken: apiToken,
});

const environment = config.get("environment") ?? "prod";

// 1. Cloudflare D1 Database for Stockly production
export const d1Database = new cloudflare.D1Database(
  `stockly-db-${environment}`,
  {
    accountId: accountId as string,
    name: `stockly-db-${environment}`,
  },
  { provider },
);

// 2. Cloudflare R2 Bucket for Stockly media uploads
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
