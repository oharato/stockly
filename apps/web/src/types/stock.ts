export interface StockItem {
  id: string;
  content: string;
  image_keys?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
  ai_comment?: string | null;
}

export interface GoalItem {
  id: string;
  title: string;
  category: string;
  color: string;
  is_archived: number;
  stock_count: number;
  created_at: string;
  updated_at: string;
}

export interface TagItem {
  name: string;
  count: number;
}

export interface UserStats {
  score: number;
  total_stocks: number;
  streak: number;
  rediscovery_count: number;
}
