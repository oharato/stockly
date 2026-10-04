import { z } from "zod";

// ストック作成用スキーマ
export const createStockSchema = z.object({
  content: z.string().min(1, "本文を入力してください").max(2000, "2000文字以内で入力してください"),
  imageKeys: z.array(z.string()).optional(),
  tagNames: z.array(z.string()).optional(),
});

export type CreateStockInput = z.infer<typeof createStockSchema>;

// ストックエンティティスキーマ
export const stockSchema = z.object({
  id: z.string(),
  content: z.string(),
  image_keys: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  ai_comment: z.string().nullable().optional(),
});

export type Stock = z.infer<typeof stockSchema>;

// 目標作成用スキーマ
export const createGoalSchema = z.object({
  title: z
    .string()
    .min(1, "目標タイトルを入力してください")
    .max(100, "100文字以内で入力してください"),
  category: z.string().optional().default("general"),
  color: z.string().optional().default("teal"),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

// 目標エンティティスキーマ
export const goalSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  color: z.string(),
  is_archived: z.number().default(0),
  stock_count: z.number().optional().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Goal = z.infer<typeof goalSchema>;

// タグ集計スキーマ
export const tagSummarySchema = z.object({
  name: z.string(),
  count: z.number(),
});

export type TagSummary = z.infer<typeof tagSummarySchema>;

// ユーザー統計スキーマ
export const userStatsSchema = z.object({
  score: z.number(),
  total_stocks: z.number(),
  rediscovery_count: z.number(),
  current_streak: z.number(),
  max_streak: z.number(),
  last_stock_date: z.string().nullable(),
  last_rediscovery_date: z.string().nullable().optional(),
});

export type UserStats = z.infer<typeof userStatsSchema>;

// 週次 AI サマリーレポートスキーマ
export const weeklySummarySchema = z.object({
  id: z.string(),
  week_key: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  stock_count: z.number(),
  summary: z.string(),
  key_themes: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type WeeklySummary = z.infer<typeof weeklySummarySchema>;
