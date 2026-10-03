import { z } from "zod";

// ストック作成用スキーマ
export const createStockSchema = z.object({
  content: z.string().min(1, "本文を入力してください").max(2000, "2000文字以内で入力してください"),
  tagNames: z.array(z.string()).optional(),
});

export type CreateStockInput = z.infer<typeof createStockSchema>;

// ストックエンティティスキーマ
export const stockSchema = z.object({
  id: z.string(),
  content: z.string(),
  image_keys: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  ai_comment: z.string().nullable().optional(),
});

export type Stock = z.infer<typeof stockSchema>;

// ユーザー統計スキーマ
export const userStatsSchema = z.object({
  score: z.number(),
  total_stocks: z.number(),
  rediscovery_count: z.number(),
  current_streak: z.number(),
  max_streak: z.number(),
  last_stock_date: z.string().nullable(),
});

export type UserStats = z.infer<typeof userStatsSchema>;
