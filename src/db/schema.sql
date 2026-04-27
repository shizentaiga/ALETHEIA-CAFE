-- npx wrangler d1 execute ALETHEIA_CAFE_DB --file=./src/db/schema.sql --local

/**
 * =============================================================================
 * 【 ALETHEIA - Database Schema 】
 * 役割：ユーザー、地点（サービス）、およびその活動記録を管理する最小コア。
 * DB名：ALETHEIA-CAFE-DB
 * =============================================================================
 */

-- =============================================================================
-- 1. テーブルの初期化
-- =============================================================================
DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

-- =============================================================================
-- 2. ユーザー管理
-- =============================================================================
CREATE TABLE users (
    user_id       TEXT PRIMARY KEY,               -- Google Auth 連携ID
    email         TEXT UNIQUE,                    -- 連絡用メールアドレス
    display_name  TEXT,                           -- 表示名
    role          TEXT DEFAULT 'USER' NOT NULL,   -- 'USER', 'ADMIN', 'OWNER'
    status        TEXT DEFAULT 'ACTIVE' NOT NULL, -- 'ACTIVE', 'SUSPENDED', 'BANNED'
    plan_id       TEXT DEFAULT 'free' NOT NULL,   -- 'free', 'pro', 'biz'
    last_login_at DATETIME,
    deleted_at    DATETIME,                       -- 退会日時（論理削除）
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 3. コアデータ（地点・サービス）
-- =============================================================================
CREATE TABLE services (
    service_id      TEXT PRIMARY KEY,
    brand_id        TEXT,                         -- チェーン店管理用（任意）
    owner_id        TEXT,                         -- ビジネスオーナーID
    plan_id         TEXT DEFAULT 'free' NOT NULL, -- 地点のリスティングプラン
    
    -- 基本情報
    title           TEXT NOT NULL,                -- 店名・施設名
    address         TEXT NOT NULL,                -- 住所フルテキスト
    lat             REAL,                         -- 緯度
    lng             REAL,                         -- 経度

    -- 動的属性（Wi-Fi、電源、決済、営業時間など）
    attributes_json TEXT DEFAULT '{}',

    -- メタデータ
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at      DATETIME                      -- 論理削除用
);

-- =============================================================================
-- 4. ユーザーアクティビティ（パーソナルデータ）
-- =============================================================================
CREATE TABLE user_activities (
    activity_id    TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL,
    service_id     TEXT NOT NULL,
    
    -- 活動記録
    favorited_at   DATETIME,                      -- お気に入り登録日時
    visited_at     DATETIME,                      -- 最終訪問日時
    
    -- パーソナルメモ
    tentative_date TEXT,                          -- 「いつか行きたい」等の予定日
    personal_memo  TEXT,                          -- 自分専用メモ
    
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service_id)                   -- 同一地点への二重登録を防止
);