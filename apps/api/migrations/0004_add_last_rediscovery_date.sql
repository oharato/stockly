-- 0004_add_last_rediscovery_date.sql
-- ユーザー統計テーブルに最終再発見振り返り日カラムを追加 (YYYY-MM-DD)
ALTER TABLE user_stats ADD COLUMN last_rediscovery_date TEXT;
