export interface StockItem {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  ai_comment?: string | null;
}

export interface UserStats {
  score: number;
  total_stocks: number;
  streak: number;
  rediscovery_count: number;
}
