import { hc } from "hono/client";
import type { AppType } from "api";

// 開発環境では Vite proxy 経由の相対パス、本番では同一オリジンまたは指定されたベースURL
export const client = hc<AppType>("/");
