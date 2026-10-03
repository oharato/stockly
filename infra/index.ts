import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

const config = new pulumi.Config();

// Cloudflare Account ID: retrieved from Pulumi config or CLOUDFLARE_ACCOUNT_ID env var
const accountId =
  config.get("accountId") ??
  process.env.CLOUDFLARE_ACCOUNT_ID ??
  pulumi.log.warn(
    "Cloudflare accountId is not set. Please set it via pulumi config set accountId <id>",
  );

const environment = config.get("environment") ?? "prod";

// 1. Cloudflare D1 Database for Stockly production
export const d1Database = new cloudflare.D1Database(`stockly-db-${environment}`, {
  accountId: accountId as string,
  name: `stockly-db-${environment}`,
});

// 2. Cloudflare R2 Bucket for Stockly media uploads
export const r2Bucket = new cloudflare.R2Bucket(`stockly-media-${environment}`, {
  accountId: accountId as string,
  name: `stockly-media-${environment}`,
  location: "apac",
});

// Stack Outputs
export const outputs = {
  environment,
  d1DatabaseId: d1Database.id,
  d1DatabaseName: d1Database.name,
  r2BucketName: r2Bucket.name,
};
