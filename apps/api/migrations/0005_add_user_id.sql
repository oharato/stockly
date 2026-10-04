-- 0005_add_user_id.sql
-- マルチユーザー/テスト用分離のための user_id カラム追加
ALTER TABLE stocks ADD COLUMN user_id TEXT DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_stocks_user_id ON stocks(user_id);

-- テスト専用ユーザーの初期統計レコード
INSERT OR IGNORE INTO user_stats (id, score, total_stocks, rediscovery_count, current_streak, max_streak)
VALUES ('e2e-test', 0, 0, 0, 0, 0);
