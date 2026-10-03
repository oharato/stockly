-- 0001_create_stocks.sql
-- ストック（日々の内省・記録）テーブル
CREATE TABLE IF NOT EXISTS stocks (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    image_keys TEXT, -- JSON文字列 (Milestone 3以降使用)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- テーマ・タグ
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    stock_id TEXT NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- AIコメントテーブル (Milestone 2以降使用)
CREATE TABLE IF NOT EXISTS ai_comments (
    id TEXT PRIMARY KEY,
    stock_id TEXT NOT NULL UNIQUE,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- ユーザー統計（シングルユーザー用: id='default'）
CREATE TABLE IF NOT EXISTS user_stats (
    id TEXT PRIMARY KEY DEFAULT 'default',
    score INTEGER DEFAULT 0,
    total_stocks INTEGER DEFAULT 0,
    rediscovery_count INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_stock_date TEXT -- YYYY-MM-DD
);

-- 初期統計レコードの作成
INSERT OR IGNORE INTO user_stats (id, score, total_stocks, rediscovery_count, current_streak, max_streak)
VALUES ('default', 0, 0, 0, 0, 0);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stocks_created_at ON stocks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_stock_id ON tags(stock_id);
