-- npx wrangler d1 execute ALETHEIA_CAFE_DB --file=./src/db/add_tables/20260515_01_add_schedule_json_to_services.sql --local

-- =============================================================================
-- Migration: Add schedule_json to services table
-- Description: iCalendar形式の構造化スケジュールデータを保存するカラムを追加
-- =============================================================================

-- 1. カラムの追加
-- attributes_json の手前に論理的に配置したいところですが、SQLの制約上、末尾（deleted_atの前など）への追加が一般的です。
-- SQLite(D1)では既存カラムの間への挿入はテーブル再作成が必要になるため、シンプルに追加します。
ALTER TABLE services ADD COLUMN schedule_json TEXT '{}';

-- 2. メタデータの更新（任意）
-- この変更自体がテーブルの定義変更であるため、既存レコードがある場合は
-- 必要に応じて updated_at を更新するなどの処理を検討してください（今回は構造のみ）。

-- 3. (参考) 今後、もしスケジュールに基づいた高度な検索を行う場合、
-- JSON内の特定値を抽出したインデックス（Generated Columns）の作成も検討の余地がありますが、
-- 現時点ではこの TEXT カラムの追加だけで十分です。
