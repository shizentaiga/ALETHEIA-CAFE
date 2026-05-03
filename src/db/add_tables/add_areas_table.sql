-- src/db/add_tables/add_areas_table.sql

-- # テーブル作成
-- npx wrangler d1 execute ALETHEIA-CAFE-DB --file=./src/db/add_tables/add_areas_table.sql --local

-- # テーブル一覧を表示
-- npx wrangler d1 execute ALETHEIA-CAFE-DB --command="SELECT name FROM sqlite_master WHERE type='table';" --local

-- # カラム構造を確認
-- npx wrangler d1 execute ALETHEIA-CAFE-DB --command="PRAGMA table_info(areas);" --local

CREATE TABLE IF NOT EXISTS areas (
    area_id    TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    area_level INTEGER NOT NULL,
    lat        REAL,
    lng        REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 検索を高速化するためのインデックスも同時に作成
CREATE INDEX IF NOT EXISTS idx_areas_id_lookup ON areas(area_id);