-- 0003_create_weekly_summaries.sql
-- 週次 AI サマリーレポートテーブル
CREATE TABLE IF NOT EXISTS weekly_summaries (
    id TEXT PRIMARY KEY,
    week_key TEXT NOT NULL UNIQUE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    stock_count INTEGER NOT NULL,
    summary TEXT NOT NULL,
    key_themes TEXT, -- JSON文字列 (例: ["プログラミング", "内省習慣"])
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_key ON weekly_summaries(week_key DESC);
